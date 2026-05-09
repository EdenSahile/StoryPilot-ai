# Audit StoryForge AI — Plan de corrections
*Généré le 2026-05-08*

## Statut sessions
**Session 1 (2026-05-08) — TERMINÉE ✅** — 9/13 issues corrigées, commitées et pushées (`9123bdc`)
**Session 2 (2026-05-09) — TERMINÉE ✅** — TECH-001 : Vitest configuré, 20 tests écrits et passants ; `onKeyPress` → `onKeyDown` dans BriefInput
**Session 3 (2026-05-09) — TERMINÉE ✅** — SEC-003 : limitation rate limiting documentée (code + README) ; TECH-005 TypeScript différé
**Session 4 (2026-05-09) — TERMINÉE ✅** — Responsive design complet (breakpoints 480/600/768px), police Plus Jakarta Sans, SVG icons, bouton pleine largeur mobile, fix `ol` padding Gherkin, prompt Gherkin sous-puces, Enter pour soumettre, validation brief vide
**Session 5 (2026-05-09) — EN COURS 🔄** — Tests recruteur en cours (voir section dédiée)

> **Note préalable :** Le fichier `.env` est correctement ignoré par git (`.gitignore`). La clé API n'est PAS exposée dans le repo. Bonne nouvelle !

---

## SÉCURITÉ

### Critique / Haut

- [x] **[SEC-001] Erreur interne exposée dans la réponse API**
  - Fichier : `api/generate-stories.js` ligne 156
  - Problème : `res.status(500).json({ error: \`Erreur serveur: ${error.message}\` })` — le message d'erreur interne (stack, chemins, détails techniques) est envoyé au client
  - Correction : renvoyer un message générique au client, garder les détails dans les logs serveur uniquement

- [x] **[SEC-002] Taille du brief non validée côté serveur (prompt injection partielle)**
  - Fichier : `api/generate-stories.js` ligne 47+
  - Problème : aucune limite de longueur max sur le `brief` côté serveur — un client malveillant peut envoyer un brief de 100 000 caractères ou injecter des instructions pour tromper le modèle
  - Correction : ajouter une limite (`brief.length > 2000`) et encadrer le brief dans le prompt avec des délimiteurs clairs (`"""`)

### Moyen

- [x] **[SEC-003] Rate limiting volatile (Map en mémoire)**
  - Fichier : `api/generate-stories.js` lignes 1-11
  - Problème : la Map est réinitialisée à chaque redéploiement Vercel (serverless = instances éphémères) → protection inefficace en production
  - Correction : migrer vers un rate limiting persistant (Vercel KV, Upstash Redis) ou documenter la limitation clairement
  - *Résolution : limitation documentée dans le code et le README — infrastructure upgrade différée*

- [x] **[SEC-004] CORS origins hardcodées dans le code**
  - Fichier : `api/generate-stories.js` ligne 22
  - Problème : `['http://localhost:5173', 'https://storyforge-ai.vercel.app']` en dur — si le domaine change, il faut modifier et redéployer le code
  - Correction : `process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']`

### Bas

- [x] **[SEC-005] `console.error` exposé en production (côté client)**
  - Fichier : `src/components/StoriesOutput.jsx` ligne 123
  - Problème : les erreurs clipboard sont loggées en clair en production, créant du bruit dans les outils de monitoring
  - Correction : supprimer ou conditionner au mode dev

- [x] **[SEC-006] DOMPurify redondant avant ReactMarkdown**
  - Fichier : `src/components/StoriesOutput.jsx` ligne 127
  - Problème : DOMPurify est appliqué sur du texte markdown pur avant de le passer à `ReactMarkdown` — or `ReactMarkdown` échappe déjà le HTML par défaut, la sanitization ici est donc sans effet réel et crée une fausse confiance
  - Correction : supprimer `DOMPurify.sanitize` (redondant), ou si on veut être strict, l'appliquer sur le HTML *rendu* via les `components` de `ReactMarkdown`

---

## DETTE TECHNIQUE

### Haut

- [x] **[TECH-001] Zéro tests dans le projet**
  - Fichiers : tout le projet
  - Problème : aucun fichier `*.test.js` / `*.spec.js`, aucun Vitest/Jest configuré — refactorisation et maintenance risquées
  - Correction : configurer Vitest + @testing-library/react, ajouter au minimum des tests unitaires pour `claudeService.js` et un test de rendu pour les composants principaux

### Moyen

- [x] **[TECH-002] Erreur clipboard silencieuse — pas de feedback utilisateur**
  - Fichier : `src/components/StoriesOutput.jsx` lignes 117-125
  - Problème : si `navigator.clipboard.writeText` échoue (HTTPS requis, permissions refusées), l'utilisateur ne voit rien et croit que ça a fonctionné
  - Correction : afficher un message d'erreur à l'utilisateur + ajouter un fallback avec `document.execCommand('copy')`

- [x] **[TECH-003] MAX_OUTPUT_LENGTH uniquement côté client**
  - Fichier : `src/components/services/claudeService.js` lignes 2 et 77
  - Problème : la limite de 4000 caractères est vérifiée côté client seulement — un client peut la contourner facilement
  - Correction : ajouter côté serveur une limite sur la taille du brief ET utiliser `max_tokens` de l'API Claude pour borner la réponse (déjà à 1000, correct)

- [x] **[TECH-004] Pas d'Error Boundary React**
  - Fichier : `src/App.jsx`
  - Problème : si `StoriesOutput` ou `BriefInput` crash en runtime, toute l'application plante sans message utile
  - Correction : créer un composant `ErrorBoundary` et wrapper les composants sensibles

### Bas

- [ ] **[TECH-005] Pas de TypeScript**
  - Fichiers : tous les `.js` / `.jsx`
  - Problème : aucun typage statique — erreurs découvertes à runtime, refactorisation dangereuse, pas d'autocomplétion IDE
  - Correction : migration progressive vers TypeScript (commencer par `claudeService.js`)

- [x] **[TECH-006] Pas de JSDoc pour `generateStories`**
  - Fichier : `src/components/services/claudeService.js` ligne 3
  - Problème : la signature de la fonction (paramètres, callbacks, comportement timeout) n'est pas documentée
  - Correction : ajouter un JSDoc avec `@param`, `@throws`, description des callbacks

- [x] **[TECH-007] Pas de `.env.example` à la racine**
  - Fichier : racine du projet (seul `src/.env.example` existe)
  - Problème : un nouveau développeur ne sait pas quelles variables d'environnement configurer à la racine
  - Correction : créer `.env.example` à la racine avec `ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE`

---

---

## Tests recruteur — Grille de validation (Session 5)

### Inputs
| Test | Statut | Résultat | Action |
|---|---|---|---|
| Brief > 2000 chars | ✅ OK | Alerte affichée | — |
| Brief < 10 chars | ✅ OK | Alerte affichée | — |
| Brief vide + clic bouton | ✅ OK | Alerte "Le brief ne peut pas être vide" | — |
| Brief en anglais | ✅ OK | Génère en anglais sur Vercel, bouton adapté | — |
| Brief espaces/retours à la ligne uniquement | ⬜ À tester | — | — |
| Brief avec caractères spéciaux / XSS | ⬜ À tester | — | — |
| Brief exactement 10 chars (limite basse) | ⬜ À tester | — | — |
| Brief exactement 2000 chars (limite haute) | ⬜ À tester | — | — |

### Comportement réseau
| Test | Statut | Résultat | Action |
|---|---|---|---|
| Couper WiFi pendant génération | ⬜ À tester | — | — |
| Recharger page pendant génération | ⬜ À tester | — | — |
| Clic rapide multiple sur "Générer" | ⬜ À tester | — | — |
| Génération successive (2x) | ⬜ À tester | — | — |

### UX / Interface
| Test | Statut | Résultat | Action |
|---|---|---|---|
| Bouton "Copier" → coller dans éditeur | ⬜ À tester | — | — |
| Test sur vrai mobile | ⬜ À tester | — | — |
| Mode sombre système | ⬜ À tester | — | — |
| Lien feedback Google Form | ⬜ À tester | — | — |

### Accessibilité
| Test | Statut | Résultat | Action |
|---|---|---|---|
| Navigation clavier uniquement (Tab/Enter) | ⬜ À tester | — | — |
| Zoom 200% navigateur | ⬜ À tester | — | — |

---

## Notes techniques

- **404 en local** : attendu — `vite dev` ne sert pas `/api`. Utiliser `vercel dev` pour tester l'API localement.
- **Langue de la réponse** : le prompt système est en français, Claude répond en français même si le brief est en anglais. À corriger.

---

## Audit sécurité/dette terminé ✅

Toutes les failles de sécurité et dettes techniques identifiées ont été corrigées ou documentées.

**TECH-005 (TypeScript)** — optionnel, différé. Le projet fonctionne correctement en JS. À envisager si le projet grossit.
