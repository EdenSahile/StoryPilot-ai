# StoryPilot AI

Générateur de user stories à partir d'un brief métier, avec streaming temps réel via l'API Claude.

## Stack

- React 18+ avec Vite 6+ (bundler)
- styled-components (CSS-in-JS)
- API Claude (Sonnet) côté serveur via `api/generate-stories.js` (route serverless Vercel)
- Tests : Vitest + @testing-library/react

## Architecture

```
api/generate-stories.js                    # route serverless : appelle Claude, rate limiting, CORS
src/components/services/claudeService.js   # client streaming SSE : timeout, erreurs
src/screens/Forge.jsx                      # formulaire brief + upload RAG
src/screens/Results.jsx                    # parsing et rendu des user stories
src/App.jsx                                # état global, orchestration
```

## Sécurité (toujours)

- Clé API Anthropic jamais côté client (variable d'environnement serveur, jamais préfixée `VITE_`).
- Ne jamais renvoyer `error.message` brut au client (SEC-001), message générique seulement.

Le reste des contraintes serveur (timeout, max_tokens, rate limiter, upload, RAG, prompt système) est dans la rule `.claude/rules/storypilot-api.md`, chargée automatiquement en travaillant sous `api/` ou `src/components/services/`. L'anti-injection CSV est dans `.claude/rules/csv-export.md` (scopée `src/logic/`).

## Discipline de branche

- **Avant de commencer tout travail (nouveau fichier, correction, feature), vérifier la branche courante (`git branch --show-current`).** Si elle est `main`, prévenir explicitement l'utilisateur avant de continuer ("Tu es sur `main`, tu veux que je crée une branche d'abord ?") plutôt que de commencer à modifier des fichiers dessus. Ne jamais créer une branche à sa place sans le dire.

## CI (`claude-pr-review.yml`)

- 3 jobs par PR : `test` (vitest), `e2e` (playwright chromium), `claude-review` (dépend des deux).
- `claude-review` ne s'exécute pas tant que le `.github/workflows/claude-pr-review.yml` de la branche diffère de `main` (protection anti-triche de l'action). Une PR qui modifie ce fichier ne reçoit pas sa propre review ; elle doit être mergée avant que le nouveau comportement s'applique. Symptôme trompeur : job vert mais aucune review (visible seulement avec `show_full_output: true`).
- Versions Node/npm verrouillées (`.nvmrc`, `engines`, `engine-strict=true` dans `.npmrc`) : Node 24 / npm 11. `vite` pin sur `^6.0.0`. Détail des incidents (lock PR #71, saga vite) : voir l'historique des PR.

## Conventions de code

- Composants fonctionnels avec hooks, pas de classes.
- Tout composant à logique non triviale a un test Vitest associé.
- JSDoc requis sur les fonctions exportées de `claudeService.js` (`@param`, `@throws`, callbacks).
- Pas de `console.error` actif en production côté client : conditionner au mode dev.
- Le prompt système envoyé à Claude est en français ; la réponse reste en français même si le brief est en anglais (voulu, ne pas "corriger" sans demande explicite).
- Toute couleur passe par un token `theme.colors.*`, jamais de `#hex` ou `rgba()` en dur.
- La logique métier réutilisable (parsing, calculs, formatage) est une fonction pure dans `src/logic/`, testée dans `src/test/` (jamais colocalisée) : `storyParser.js`, `csvExport.js`, `initialScreen.js`, `themeStorage.js`, `dashboardStats.js`.
