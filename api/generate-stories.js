
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

export default async function handler(req, res) {
  // Seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }



  // ✅ CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'https://story-forge-ai-blond.vercel.app'];
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();

// ✅ Rate limiting
const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
if (!checkRateLimit(clientIp)) {
  return res.status(429).json({ error: 'Trop de requêtes. Maximum 10 par 15 minutes.' });
}

  const { brief } = req.body;

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

  // Vérifie la clé API côté serveur
  const apiKey = process.env.ANTHROPIC_API_KEY; 

  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante sur le serveur.' });
  }

  try {
    // Appel à Claude API avec streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        stream: true, // On utilise le streaming!
        system: `Tu es un expert Product Owner Scrum.
Génère des user stories détaillées et professionnelles.

Pour chaque user story, utilise EXACTEMENT ce format :

**User Story N** En tant que [rôle précis], je veux [action détaillée] afin de [bénéfice métier concret].

**Description :**
[2-3 phrases de contexte métier détaillé expliquant le besoin]

**Critères d'acceptation :**
- [critère précis et testable]
- [critère précis et testable]
- [critère précis et testable]
- [critère précis et testable]

**Scénarios Gherkin :**

Scénario 1 : [nom du scénario principal]
- Étant donné [contexte]
- Quand [action]
- Alors [résultat]
- Et [condition complémentaire]

Scénario 2 : [nom du cas alternatif ou d'erreur]
- Étant donné [contexte]
- Quand [action]
- Alors [résultat]

**Complexité :** S|M|L

---

Génère 3 à 5 user stories. Sois précis, professionnel et détaillé.
Sépare chaque story par ---`,

        messages: [
          {
            role: 'user',
            content: `Brief :\n"""\n${brief.trim()}\n"""`
          }
        ]
      })
    });

    // Gère les erreurs HTTP
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || `Erreur API (${response.status})`;

      if (response.status === 401) {
        return res.status(401).json({ error: 'Clé API invalide ou expirée.' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Trop de requêtes. Réessayez dans quelques secondes.' });
      } else if (response.status === 500) {
        return res.status(500).json({ error: 'Serveur Claude indisponible. Réessayez plus tard.' });
      } else {
        return res.status(response.status).json({ error: `Erreur API : ${errorMessage}` });
      }
    }

    // Configure les headers pour le streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream la réponse de Claude directement au frontend
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
            // Envoie chaque chunk au frontend via SSE
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch (e) {
          // Ignorer les lignes JSON malformées
        }
      }
    }

    res.end();
  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
  }
}