import { applyCors } from './_cors.js';
import { normalizeClientName, CLIENT_NAME_MAX } from './_ingest.js';

// Modèle Claude utilisé pour la génération. Surchargeable via la variable
// d'environnement serveur ANTHROPIC_MODEL (jamais préfixée VITE_, cf. CLAUDE.md)
// pour tester un autre modèle sans redéploiement de code ; défaut = le modèle
// validé en production.
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

const requestCounts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000;
  if (!requestCounts.has(ip)) requestCounts.set(ip, []);
  const recentRequests = requestCounts.get(ip).filter(t => t > windowStart);
  if (recentRequests.length >= 10) return false;
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  return true;
}

export const config = { maxDuration: 60 }; // Streaming 3-5 stories peut dépasser le défaut sans config explicite

export default async function handler(req, res) {
  // ✅ CORS
  if (applyCors(req, res, { methods: 'POST, OPTIONS' })) return;

  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

// ✅ Rate limiting
const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
if (!checkRateLimit(clientIp)) {
  return res.status(429).json({ error: 'Trop de requêtes. Maximum 10 par 15 minutes.' });
}

  const { brief, contextChunks, clientName } = req.body;

  // Validation du brief
  if (!brief || brief.trim().length === 0) {
    return res.status(400).json({ error: 'Veuillez entrer un brief métier.' });
  }

  if (brief.trim().length < 10) {
    return res.status(400).json({ error: 'Le brief doit contenir au moins 10 caractères.' });
  }

  if (brief.trim().length > 2000) {
    return res.status(400).json({ error: 'Le brief ne peut pas dépasser 2000 caractères.' });
  }

  // ── Validation de contextChunks (sécurité + coût) ────────────────────────────
  // `contextChunks` vient du corps de requête, entièrement contrôlé par l'appelant
  // HTTP : `retrieveContext()` côté client (qui interroge Pinecone avec le seuil de
  // pertinence 0.46 calibré, cf. api/retrieve-context.js) et cet endpoint sont deux
  // appels réseau *indépendants*. Sans ce garde-fou, un appel direct à
  // /api/generate-stories hors UI peut fournir un `contextChunks` fabriqué de toutes
  // pièces : injection de prompt via un faux chunk, explosion du coût (le rate
  // limiting borne la *fréquence* des requêtes, pas leur *poids*), et contournement
  // complet de la calibration RAG (seuil 0.46, clause d'exception anti-hallucination).
  //
  // Plafonds dérivés de la VRAIE distribution des chunks indexés dans Pinecone
  // (index "storyforge", 8 documents, 21 vecteurs), mesurée en interrogeant
  // directement l'index — PAS du `chunkSize` déclaré dans le code du splitter.
  // Le LOT 3 avait dérivé MAX_CHUNK_CHARS du `chunkSize: 500` de api/upload-doc.js
  // et cassé le RAG en prod : les chunks stockés reflètent un `chunkSize` d'environ
  // 1600 (max mesuré 1597), pas les 500 du code actuel — cf. context.md, session
  // RAG-3, qui a posé `chunkSize: 1600` puis dont l'étape « Re-indexer » n'a jamais
  // été faite. Le code du splitter est donc désynchronisé des données stockées.
  //
  // Distribution réelle mesurée (2026-08-31, tous chunks confondus) :
  //   min 68 · moyenne 1135 · p90 1568 · max 1597 caractères.
  //   Somme des 20 chunks les plus longs (pire cas pour topK=20) : 23 759.
  //
  //  - MAX_CONTEXT_CHUNKS = 20 : maximum exact de `topK` validé dans
  //    api/retrieve-context.js (entier 1–20), indépendant de la taille des chunks.
  //    `retrieveContext` ne peut pas en renvoyer davantage ; le filtre de score ne
  //    fait que réduire ce nombre. Inchangé.
  //  - MAX_CHUNK_CHARS = 2500 : max réel observé 1597 + ~56 % de marge (variance de
  //    ré-indexation, ajout d'un document à public/docs/). Rejette quand même tout
  //    chunk manifestement anormal (> 4× la moyenne réelle).
  //  - MAX_CONTEXT_TOTAL_CHARS = 28000 : somme des 20 plus longs chunks indexés
  //    (23 759, ≈ la somme de TOUT l'index) + ~18 % de marge.
  //
  // Toute ré-indexation de public/docs/ (ou ajout de documents) impose de
  // re-mesurer cette distribution et d'ajuster ces plafonds — ne jamais les
  // re-dériver du `chunkSize` déclaré dans api/upload-doc.js.
  if (contextChunks !== undefined && contextChunks !== null) {
    const MAX_CONTEXT_CHUNKS = 20;
    const MAX_CHUNK_CHARS = 2500;
    const MAX_CONTEXT_TOTAL_CHARS = 28000;

    const badContext = (reason) => {
      // Détail loggé côté serveur uniquement (SEC-001) ; message client générique.
      console.error(`[generate-stories] contextChunks rejeté : ${reason}`);
      return res.status(400).json({ error: 'Contexte documentaire invalide.' });
    };

    if (!Array.isArray(contextChunks)) {
      return badContext('type invalide (pas un tableau)');
    }
    if (contextChunks.length > MAX_CONTEXT_CHUNKS) {
      return badContext(`${contextChunks.length} chunks (max ${MAX_CONTEXT_CHUNKS})`);
    }

    let totalChars = 0;
    for (const chunk of contextChunks) {
      if (!chunk || typeof chunk.filename !== 'string' || typeof chunk.text !== 'string') {
        return badContext('chunk sans filename/text de type string');
      }
      if (chunk.text.length > MAX_CHUNK_CHARS) {
        return badContext(`chunk de ${chunk.text.length} caractères (max ${MAX_CHUNK_CHARS})`);
      }
      totalChars += chunk.text.length;
    }
    if (totalChars > MAX_CONTEXT_TOTAL_CHARS) {
      return badContext(`total ${totalChars} caractères (max ${MAX_CONTEXT_TOTAL_CHARS})`);
    }
  }

  // ── Validation de clientName ───────────────────────────────────────────
  // Ce nom est injecté tel quel dans le prompt système et vient du corps de la
  // requête : il est donc contrôlé par l'appelant, au même titre que
  // contextChunks. normalizeClientName borne sa longueur et refuse tout
  // caractère de contrôle, ce qui ferme la voie la plus simple à une injection
  // d'instructions. Rejet explicite plutôt qu'ignorance silencieuse : une
  // valeur invalide signale un bug de l'appelant, pas une préférence.
  let clientNameValide = null;
  if (clientName !== undefined && clientName !== null) {
    clientNameValide = normalizeClientName(clientName);
    if (clientNameValide === null) {
      console.error('[generate-stories] clientName rejeté : type, longueur ou caractères invalides');
      return res.status(400).json({ error: 'Nom de client invalide.' });
    }
  }

  // Vérifie la clé API côté serveur
  const apiKey = process.env.ANTHROPIC_API_KEY; 

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante sur le serveur.' });
  }

  let claudeTimeout;
  // Passe à true dès que les en-têtes SSE sont envoyés : à partir de là on ne
  // peut plus repasser en réponse JSON (ERR_HTTP_HEADERS_SENT). Le catch s'en
  // sert pour distinguer erreur pré-streaming (→ JSON) et erreur post-streaming
  // (→ on ferme juste le flux).
  let streamStarted = false;

  try {
    const briefLength = brief.trim().length;
    const storyInstruction = briefLength < 300
      ? "Génère 3 user stories maximum."
      : briefLength <= 800
      ? "Génère 4 user stories maximum."
      : "Génère 3 user stories maximum — le brief est dense, sois sélectif et concis.";

    // Quand le nom du client est connu, il est affirmé une fois et le modèle n'a
    // plus aucune raison d'en inventer un. Quand il ne l'est pas, on conserve le
    // repli neutre, vérifié sur 5 générations le 2026-11-25.
    const regleNom = clientNameValide
      ? `- Le client s'appelle exactement "${clientNameValide}". Tu DOIS employer ce nom et aucun autre pour désigner l'entreprise, sans variante ni abréviation, ainsi que les spécificités présentes dans le CONTEXTE ci-dessus\n- Cette graphie vaut pour le nom de l'entreprise et pour lui seul. Tout autre terme du CONTEXTE (nom de produit, de programme, de partenaire) se reprend exactement tel qu'il y est écrit, même si son orthographe diffère de celle du nom de l'entreprise\n`
      : `- Tu DOIS mentionner le nom de l'entreprise s'il apparaît explicitement dans le CONTEXTE ci-dessus, ainsi que les spécificités qui s'y trouvent\n- Si le contexte ci-dessus ne nomme pas l'entreprise, n'invente JAMAIS de nom : écris "le client" ou "l'entreprise". Un nom d'entreprise inventé est une erreur grave, même s'il semble plausible\n`;

    const contextBlock = contextChunks && contextChunks.length > 0
      ? `\n\n---\nCONTEXTE DOCUMENTAIRE OBLIGATOIRE (documents internes du client) :\n${contextChunks.map((c, i) => `[Source ${i + 1} — ${c.filename}]\n${c.text}`).join("\n\n")}\n---\n\nINSTRUCTIONS IMPÉRATIVES pour utiliser ce contexte :\n- Tu dois TOUJOURS générer les user stories demandées — jamais refuser, jamais demander de clarification ou proposer plusieurs options au client\n${regleNom}- Tu DOIS réutiliser le vocabulaire exact des documents (noms de produits, délais, processus, références)\n- Chaque user story DOIT contenir au moins un élément concret issu des documents ci-dessus\n- Les critères d'acceptation DOIVENT refléter les règles métier réelles du client\n- INTERDIT de générer des user stories génériques qui s'appliqueraient à n'importe quelle entreprise — SAUF sur l'exception suivante\n- EXCEPTION, et seulement dans ce cas : si le brief porte sur une CATÉGORIE DE PRODUITS ou un DOMAINE D'ACTIVITÉ dont les documents ne font jamais mention (par exemple un brief sur des téléphones alors que les documents décrivent un tout autre commerce), ne prétends pas que ce client vend, propose, envisage de proposer ou pourrait proposer ces produits, n'invente aucune caractéristique, prix, programme ou nom lié à ce point, et rédige ces stories-là de façon générique, comme pour n'importe quel e-commerce, sans y plaquer le nom de l'entreprise ni AUCUN fait documenté (projets, implantations, programmes, processus, chiffres), même s'il semble s'en rapprocher
- Ce n'est PAS le cas d'une NOUVELLE FONCTIONNALITÉ portant sur l'activité ou les produits que les documents décrivent. Une fonctionnalité absente des documents est la situation NORMALE d'une user story, dont le rôle est précisément de spécifier ce qui n'existe pas encore. Dans ce cas, emploie le nom de l'entreprise et le vocabulaire métier des documents comme pour le reste, formule la fonctionnalité comme un besoin à construire, et contente-toi de n'inventer aucun fait la concernant : ni chiffre, ni délai, ni partenaire, ni programme, ni caractéristique présentée comme déjà existante
- Le reste du brief qui a un équivalent documenté suit les instructions ci-dessus normalement
- Si une information n'est pas présente dans les sources fournies (délais exacts, noms de transporteurs, formats techniques, etc.), ne l'invente pas — utilise une formulation générique (ex: "le système envoie une confirmation" plutôt qu'un délai précis non vérifié)`
      : "";

    // Timeout de 30 s sur l'appel à Claude (règle CLAUDE.md + .claude/rules/storypilot-api.md).
    // Borne le temps d'établissement de la réponse ; le streaming qui suit est
    // borné séparément par `export const config = { maxDuration: 60 }`. Sur abort,
    // fetch lève une AbortError, rattrapée dans le catch du handler (→ 504 générique).
    const claudeAbort = new AbortController();
    claudeTimeout = setTimeout(() => claudeAbort.abort(), 30_000);

    // Appel à Claude API avec streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: claudeAbort.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8000, // 3-4 stories (storyInstruction) × 3 scénarios Gherkin ≈ 3 000-4 000 tokens (mesuré via js-tiktoken/cl100k_base comme proxy sur un exemple réel de 3 stories à 2 scénarios : ~644 tokens/story, +~98 tokens pour un 3e scénario de 4 lignes) — 8000 garde une marge large, pas d'augmentation nécessaire malgré le passage de 2 à 3 scénarios (CLAUDE.md: justification requise)
        stream: true, // On utilise le streaming!
        system: `Tu es un expert Product Owner Scrum.
Génère des user stories détaillées et professionnelles.

Pour chaque user story, utilise EXACTEMENT ce format :

**User Story N** En tant que [rôle précis], je veux [action détaillée] afin de [bénéfice métier concret].

**Titre :** [titre court, verbe + objet, 8 mots maximum, distinct de la phrase "En tant que / je veux / afin de"]

**Description :**
[2-3 phrases de contexte métier détaillé expliquant le besoin]

**Critères d'acceptation :**
- [critère précis et testable]
- [critère précis et testable]
- [critère précis et testable]
- [critère précis et testable]

**Scénarios Gherkin :** (MAXIMUM 3 scénarios, 4 lignes chacun — ne pas dépasser)

Scénario 1 : [nom du scénario principal]
- Étant donné [contexte]
- Quand [action]
- Alors [résultat attendu]
- Et [condition complémentaire]

Scénario 2 : [cas alternatif]
- Étant donné [contexte différent]
- Quand [action]
- Alors [résultat]

Scénario 3 : [cas d'erreur ou cas limite, distinct des deux scénarios précédents]
- Étant donné [contexte différent]
- Quand [action]
- Alors [résultat]

**Complexité :** S|M|L

---

${storyInstruction} Sois précis, professionnel et détaillé.
Sépare chaque story par ---${contextBlock}`,

        messages: [
          {
            role: 'user',
            content: `Brief :\n"""\n${brief.trim()}\n"""`
          }
        ]
      })
    });

    // Réponse reçue : le timeout ne concerne que l'établissement de l'appel,
    // pas la durée du streaming (bornée par maxDuration).
    clearTimeout(claudeTimeout);

    // Gère les erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const anthropicType = errorData?.error?.type;
      const anthropicMessage = errorData?.error?.message || '';

      // SEC-001 : le détail réel de l'erreur upstream est loggé côté serveur
      // uniquement, jamais renvoyé au client (aucun errorMessage brut).
      console.error(
        `[generate-stories] Erreur API Claude ${response.status} ` +
        `(${anthropicType || 'type inconnu'}) : ${anthropicMessage || '(pas de message)'}`
      );

      // Budget de la démo épuisé. Formes réelles renvoyées par Anthropic
      // (cf. https://platform.claude.com/docs/en/api/errors) :
      //   - 402 error.type "billing_error"       : crédit / moyen de paiement épuisé
      //   - 400 error.type "invalid_request_error": plafond de dépense org/workspace atteint
      //   - 429 error.type "rate_limit_error"    : plafond de dépense mensuel du palier d'usage
      // Les deux derniers codes HTTP sont partagés avec des erreurs sans rapport,
      // d'où le test complémentaire sur le libellé du message ("credit balance",
      // "spend limit/cap") en plus du type "billing_error".
      const budgetEpuise =
        anthropicType === 'billing_error' ||
        /credit balance|spend (?:limit|cap)/i.test(anthropicMessage);

      if (budgetEpuise) {
        return res.status(response.status).json({
          error: 'La démo a atteint son budget mensuel, réessaie le mois prochain.',
        });
      }

      if (response.status === 401) {
        return res.status(401).json({ error: 'Clé API invalide ou expirée.' });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' });
      }
      if (response.status === 500) {
        return res.status(500).json({ error: 'Serveur Claude indisponible. Réessayez plus tard.' });
      }
      return res.status(response.status).json({ error: 'Erreur lors de la génération. Réessaie plus tard.' });
    }

    // Configure les headers pour le streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    streamStarted = true;

    // Stream la réponse de Claude directement au frontend.
    // `response.body` peut être null et `reader.read()` peut rejeter en cours de
    // route (coupure réseau côté Anthropic) : dans les deux cas on tombe dans le
    // catch avec streamStarted === true, donc sans tenter de renvoyer du JSON.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Garder la dernière ligne incomplète
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();

        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6); // Retirer "data: "

        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n');
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          const text = parsed.delta?.text;

          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }

          if (parsed.type === 'message_delta' && parsed.delta?.stop_reason === 'max_tokens') {
            res.write(`data: ${JSON.stringify({ truncated: true })}\n\n`);
          }

          if (parsed.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ stop: true })}\n\n`);
          }
        } catch (e) {
          // Ignorer les lignes JSON malformées
        }
      }
    }

    res.end();
  } catch (error) {
    clearTimeout(claudeTimeout);

    // Timeout de 30 s dépassé pendant l'établissement de l'appel à Claude
    // (AbortController). Le timeout est désarmé dès la réponse reçue, donc ce
    // cas se produit toujours avant le début du streaming : aucun header envoyé.
    // Le `&& !streamStarted` est une ceinture de sécurité : si une AbortError
    // survenait malgré tout après les en-têtes SSE, on la traite comme une
    // erreur post-streaming juste en dessous (fermeture du flux, pas de JSON).
    if (error?.name === 'AbortError' && !streamStarted) {
      console.error('[generate-stories] Timeout 30 s dépassé sur l\'appel à Claude');
      return res.status(504).json({
        error: 'Le serveur a mis trop de temps à répondre. Réessaie dans un instant.',
      });
    }

    console.error('Erreur serveur:', error);

    if (streamStarted || res.headersSent) {
      // En-têtes SSE déjà partis : impossible de repasser en JSON. On ferme
      // proprement le flux ; côté client, l'absence de `[DONE]`/`stop` est
      // déjà interprétée comme une génération tronquée (cf. claudeService.js).
      try {
        res.end();
      } catch {
        // socket déjà fermée
      }
      return;
    }

    res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
  }
}