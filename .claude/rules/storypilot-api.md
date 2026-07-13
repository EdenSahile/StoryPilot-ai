---
paths:
  - "api/**"
---

# Règles API StoryPilot

- Ne jamais exposer la clé API Anthropic côté client, uniquement via variable d'environnement serveur
- Toute requête vers Claude doit avoir un timeout de 30 secondes maximum
- Gérer explicitement les codes d'erreur 401 (clé invalide), 429 (rate limit), 500 (serveur indisponible) avec un message utilisateur clair pour chacun
- Le rate limiter en mémoire (Map) n'est pas persistant entre les cold starts Vercel — le signaler dans tout commentaire touchant à cette logique
- Plafonner la réponse à 4000 caractères pour éviter les blocages UI
