---
paths:
  - "api/**"
  - "src/components/services/**"
---

# Règles API StoryPilot

Contraintes serveur non négociables. Le détail des incidents qui les motivent est dans `context.md` (sessions citées).

## Sécurité

- Clé API Anthropic jamais côté client : uniquement en variable d'environnement serveur (`ANTHROPIC_API_KEY`), jamais préfixée `VITE_`.
- Toute erreur serveur renvoyée au client est un message générique. Ne jamais renvoyer `error.message` brut (SEC-001) ; logger le détail côté serveur seulement.
- Origins CORS autorisées depuis `process.env.ALLOWED_ORIGINS`, jamais en dur.
- Brief limité à 2000 caractères, validé côté serveur (pas seulement client), encadré par des délimiteurs `"""` dans le prompt (anti-injection).

## Appel Claude

- Timeout 30s max sur tout appel Claude (`AbortController` dans `generate-stories.js` ; le streaming est borné par `config.maxDuration`).
- Gérer explicitement 401, 429, 500, plus timeout (504) et `billing_error`, avec un message clair par cas.
- `max_tokens` = 8000 (couvre 3-5 stories x 3 scénarios Gherkin, mesuré au js-tiktoken). Toute hausse justifiée par un calcul réel, jamais estimée. Garde-fou anti-blocage UI côté client (`MAX_OUTPUT_LENGTH` dans `claudeService.js`).
- Rate limiter en mémoire (Map) non persistant entre cold starts Vercel : le signaler dans tout commentaire ou PR touchant cette logique tant que la migration Vercel KV / Upstash n'est pas faite.

## Upload de documents (`upload-doc.js`)

- Extension `.txt`, `.pdf` ou `.docx`, validée côté serveur avant `extractText()`. Absente ou non supportée → rejet 400 explicite (`Format non supporté : .xyz. Utilisez PDF, DOCX ou TXT.`), jamais via une exception.
- `unpdf` pin sur `~1.7.0` (pas `^`). Ne pas monter de version sans revérifier les `engines` déclarés par la version ciblée (cf. context.md, session NODE-VERSION-LOCK).

## RAG (`retrieve-context.js`, `generate-stories.js`)

- `topK` : entier de 1 à 20 inclus, validé côté serveur avant Pinecone. Absent → défaut 5. Invalide (y compris une string comme `"5"`) → rejet 400, pas de coercition silencieuse.
- Seuil de pertinence RAG = `0.45` en dur (calibré le 2026-08-25, cf. context.md CALIBRATION-SEUIL-RAG). Le modifier reste une décision explicite après revue des données, jamais automatique. Recalibrer via `npm run calibrate-threshold` si `public/docs/` change.
- `contextChunks` (corps de requête, interpolé dans le prompt système) : validé côté serveur. Absent/null/`[]` → génération sans contexte. Présent → tableau de ≤ 20 éléments, chacun avec `filename` et `text` string, `text` ≤ 2500 caractères, somme ≤ 28000. Violation → rejet 400 générique (`Contexte documentaire invalide.`), détail loggé serveur (SEC-001). Les plafonds `MAX_CHUNK_CHARS` / `MAX_CONTEXT_TOTAL_CHARS` sont dérivés de la VRAIE distribution des chunks indexés dans Pinecone (mesurée le 2026-08-31 : min 68 / moyenne 1135 / p90 1568 / max 1597 caractères, somme top-20 = 23 759), jamais du `chunkSize` du splitter (cf. context.md RAG-3 : dériver du code avait cassé le RAG en prod). Toute ré-indexation de `public/docs/` impose de re-mesurer et d'ajuster ces plafonds.
- Prompt système : toujours autoriser le modèle à rester générique sur un point du brief quand le contexte RAG ne montre aucun équivalent métier. Ne jamais forcer un rattachement inventé (fausse caractéristique, faux prix, faux programme). Toute modif de cette clause est revérifiée avec le brief de reproduction "téléphone" avant merge (cf. context.md HALLUCINATION-RAG-PARSING).
