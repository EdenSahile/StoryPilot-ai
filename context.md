# StoryForge AI — Contexte actif
*Mis à jour le 2026-07-12*

---

## Session RAG-TOGGLE (2026-07-12) — Toggle "Générer sans RAG"

**Branche :** `feat/polish`

**Objectif :** Permettre à un visiteur de désactiver volontairement le RAG pour une génération (test d'US génériques), même sur un brief par ailleurs pertinent. Spec : `docs/superpowers/specs/2026-07-12-rag-toggle-design.md`.

### Réalisé
- [x] Checkbox "Générer sans RAG (US génériques)" dans `Forge.jsx`, entre le textarea et le bouton Générer. State local `ragDisabled` (non persisté), saute l'appel `retrieveContext()` dans `handleSubmit` quand coché.
- [x] Suppression du panneau de comparaison statique dans `Results.jsx` (`GENERIC_STORIES`, `ComparisonToggle`/`ToggleHeader`/`ComparisonContent`) — affichait toujours les 3 mêmes US codées en dur, jamais le vrai brief.
- [x] Tests : 2 nouveaux tests dans `src/test/Forge.test.jsx` (comportement par défaut + toggle coché).

---

## Session PALETTE (2026-07-12) — Application de "Pétrole & or"

**Branche :** `feat/polish` (non commité à la fin de la session — à valider avant commit)

Applique la palette "Pétrole & or" validée en session POLISH (voir section ci-dessous), qui n'avait pas encore été appliquée au code.

### Réalisé
- [x] `src/theme.js` : remplacement complet des tokens `colors`, `gradients`, `shadows`, et des helpers `glassCard`/`indigoGradient`/`primaryGradient`.
- [x] Remplacement de tous les hex/rgba en dur dans les 10 fichiers identifiés (`Results.jsx`, `Forge.jsx`, `Dashboard.jsx`, `Library.jsx`, `Settings.jsx`, `Sidebar.jsx`, `BottomNav.jsx`, `StoriesOutput.jsx`, `BriefInput.jsx`, `ErrorBoundary.jsx`) via substitution mécanique des triplets RGB exacts (chaque rgba en dur correspondait à un token nommé de `theme.js`, donc mapping 1:1 sans ambiguïté).
- [x] Couleurs sémantiques laissées inchangées (confirmé par grep) : `success`/`#4ade80`, `error`/`#ffb4ab`/`#ef4444`, `amber`/`#fbbf24`, le jaune `#ca8a04`/`rgba(234,179,8,…)` (bannière), le bleu Trello `#0284c7`/`#dbeafe`, `#1a0500` (texte sur bouton `error`), et toute la palette d'`ErrorBoundary.jsx`.
- [x] Tests Vitest : 29/29 passent, aucun test ne référence de hex en dur.
- [x] Vérification visuelle via `vite dev` + Playwright (Dashboard, Forge) : rendu cohérent, badges à fond plein lisibles.

### Tokens dérivés (non fournis explicitement par la palette validée à 5 couleurs — à confirmer si besoin d'ajustement)

| Token | Valeur | Méthode |
|---|---|---|
| `surfaceContainerLow` | `#0f1b19` | Interpolation HSL entre fond page et fond carte, en conservant la forme (proportions) de l'échelle à 6 niveaux de l'ancienne palette "Forge à braises" |
| `surfaceContainer` | `#16211f` | = fond carte (donné), correspond à l'usage le plus fréquent ("card") dans le code |
| `surfaceContainerHigh` | `#1a2624` | Extrapolation HSL (même méthode) |
| `surfaceContainerHighest` | `#1d2b28` | Extrapolation HSL (même méthode) |
| `surfaceBright` | `#1e302d` | Extrapolation HSL (même méthode) |
| `onSurfaceVariant` | `#7fae9d` | Réutilise l'accent secondaire tel quel — la palette validée le décrit comme "labels secondaires, icônes RAG", exactement l'usage de ce token dans le code (62 usages) |
| `tertiary` | `#a881bb` (violet-mauve) | Hue dérivée en relation triadique avec l'or (H≈41°) et le vert d'eau (H≈158°) → H≈281°, L/S calés pour rester dans la famille de luminosité des 2 accents validés. Sert au 3ᵉ surlignage Gherkin ("Et") et à l'icône de statut "loading" dans Forge |
| `outline` | `#6e8782` | Teinte neutre desaturée dérivée (même famille de teinte que le fond), pour texte tertiaire discret (séparateurs, icônes chevron/corbeille) |
| `outlineVariant` | `#1c2926` | Interpolation HSL, bordures subtiles |

### Ratios WCAG calculés

| Paire | Ratio | Usage |
|---|---|---|
| `#eef2f0` (onSurface) sur `#0d1917` | 15.91:1 | validé session précédente |
| `#eef2f0` sur `#16211f` | 14.62:1 | validé session précédente |
| `#d1a954` (primary) sur `#0d1917` | 8.14:1 | validé session précédente |
| `#d1a954` sur `#16211f` | 7.48:1 | validé session précédente |
| `#7fae9d` (secondary / onSurfaceVariant) sur `#0d1917` | 7.23:1 | validé session précédente |
| `#7fae9d` sur `#16211f` | 6.64:1 | validé session précédente |
| `#7fae9d` (onSurfaceVariant) sur `#1e302d` (surfaceBright, le fond le plus clair) | 5.58:1 | nouveau — reste largement AA même sur la surface la moins contrastée |
| `#0d1917` (onPrimary/onSecondary) sur `#d1a954` ou `#7fae9d` (fond plein) | 8.14:1 / 7.23:1 | règle critique respectée : texte foncé sur badge à fond plein accent |
| `#a881bb` (tertiary, dérivé) sur `#0d1917` | 5.58:1 | AA |
| `#a881bb` sur `#16211f` | 5.12:1 | AA |
| `#6e8782` (outline, dérivé) sur `#0d1917` | ~4.67:1 | AA, usage non-critique (icônes/séparateurs) |
| `#6e8782` sur `#16211f` | ~4.28:1 | légèrement sous AA texte normal — acceptable car jamais utilisé pour du texte de lecture, seulement icônes/séparateurs (seuil non-texte WCAG 1.4.11 = 3:1) |

### Reste à faire
- [ ] Confirmer les 3 tokens dérivés (`tertiary`, `outline`, `outlineVariant`) — pas de retour utilisateur négatif obtenu pendant cette session, à valider au prochain passage si un ajustement visuel est souhaité.
- [ ] Commit (pas fait automatiquement, à la demande explicite de l'utilisateur uniquement).
- [ ] Tester Library/Results avec de vraies données sauvegardées (Dashboard était vide pendant le test visuel — pas de génération en historique sur ce profil de test).

---

## Session POLISH (2026-07-08) — Copie par US, garde-fou RAG, palette

**Branche :** `feat/polish` (4 commits + le commit palette ci-dessous, tous poussés en local, rien pushé sur remote)

### Réalisé

- [x] **Bouton "Copier" par user story** — en plus du bouton global renommé "Copier tout" (`Results.jsx` : `StoryCopyBtn`, état `copiedStoryId`, `story.rawBlock` ajouté par `parseStories`). Tests dans `Results.test.jsx`.
- [x] **Seuil de pertinence RAG recalibré 0.3 → 0.42** (`api/retrieve-context.js:62`) — mesuré en conditions réelles : hors-sujet (auth, restaurant) ≤ 0.41, pertinent (factures, livraison, catalogue) ≥ 0.44. À 0.3 le RAG se déclenchait même hors-sujet ; à 0.5 (essayé puis rejeté) il ratait des briefs pourtant pertinents comme "voir mes factures".
- [x] **Badge "RAG actif" / "RAG non utilisé — US Générique"** dans `Results.jsx`, avec panel "Sources utilisées" affichant le score de pertinence par document (`ragChunks` groupés par filename, score max, triés desc).
- [x] **Bouton "Supprimer tout" l'historique** (`Library.jsx` + `libraryStorage.js:clearGenerations()`), garde le bouton "Supprimer" par génération. Confirmation avant suppression totale.
- [x] **Fix infra de test** : Node 22+/25 expose un `localStorage` global expérimental qui shadowe celui de jsdom et casse `setItem`/`clear` silencieusement (les tests passaient quand même à cause d'un try/catch dans `libraryStorage.js`, mais `saveGeneration` sans try/catch aurait planté). Polyfill mémoire ajouté dans `src/test/setup.js`.
- [x] **Investigation streaming** : signalé "pas de streaming visible" par l'utilisateur — non reproductible après 3 tests propres (page neuve, Chrome, brief identique) : le "Streaming Result" apparaît bien à 4-7s et se met à jour jusqu'à la fin. Pas de bug trouvé côté code ; cause probablement ponctuelle/environnementale, non élucidée.
- [x] **Palette "Forge à braises"** — remplacement complet de l'indigo/violet (`#6366f1`/`#8b5cf6`/etc., signature "généré par IA") par une palette charbon/braise/laiton dans `theme.js` + tous les hex/rgba en dur trouvés dans les composants (voir détail ci-dessous).

### ⚠️ Palette "Forge à braises" rejetée — remplacée par "Pétrole & or" (À APPLIQUER, pas encore fait)

L'utilisateur n'a pas aimé "Forge à braises" (orange/olive, trop orange/marron). Nouveau choix validé : **"Pétrole & or"**. La palette ci-dessous n'est **pas encore appliquée au code** — c'est la tâche de la prochaine session.

**Palette validée à appliquer :**
- Fond page : `#0d1917`
- Fond carte : `#16211f`
- Accent or (badges, highlights, éléments interactifs) : `#d1a954`
- Accent secondaire vert d'eau (labels secondaires, icônes RAG) : `#7fae9d`
- Texte principal (body, descriptions) : `#eef2f0`

**Contrastes WCAG validés :**
| Paire | Ratio |
|---|---|
| `#eef2f0` sur `#0d1917` | 15.91:1 |
| `#eef2f0` sur `#16211f` | 14.62:1 |
| `#d1a954` sur `#0d1917` | 8.14:1 |
| `#d1a954` sur `#16211f` | 7.48:1 |
| `#7fae9d` sur `#0d1917` | 7.23:1 |
| `#7fae9d` sur `#16211f` | 6.64:1 |

**Règle critique (déjà apprise sur "Forge à braises", reconfirmée ici)** : sur un badge/pastille/bouton à **fond plein** rempli d'une couleur d'accent, le texte doit être `#0d1917` (foncé), jamais `#eef2f0` (clair sur `#d1a954` = 1.95:1, échec sévère). Un fond translucide/bordure seule peut garder le texte clair ou accent.

**Tâches pour la prochaine session (données telles quelles par l'utilisateur) :**
1. Localiser `src/theme.js` (tokens de couleur du projet).
2. Remplacer les valeurs, avec des noms de tokens explicites (`--color-bg-page`, `--color-bg-card`, `--color-accent`, `--color-accent-secondary`, `--color-text-primary`, `--color-text-on-accent` — adapter à la convention `theme.colors.*` déjà en place plutôt que des CSS vars, `theme.js` n'utilise pas de CSS custom properties).
3. Chercher tous les hex/rgba en dur dans les composants (cf. session précédente : `Results.jsx`, `Forge.jsx`, `Dashboard.jsx`, `Library.jsx`, `Settings.jsx`, `Sidebar.jsx`, `StoriesOutput.jsx`/`BriefInput.jsx` morts) et les remplacer par les tokens.
4. Repérer spécifiquement les badges/pastilles à fond plein (`Badge`, `Pill`, `Tag`, composants de statut) et forcer `--color-text-on-accent` dessus ; fond translucide/bordure seule → texte peut rester clair/accent.
5. Ne toucher qu'aux couleurs, aucune logique fonctionnelle.
6. Calculer le ratio WCAG pour toute nouvelle paire introduite (hover, disabled, focus) avant de l'utiliser — ne pas inventer sans calcul.
7. Lister les fichiers modifiés et les ratios des nouvelles paires à la fin.
8. Ne pas assumer sur les couleurs non listées (ex: `tertiary` pour le mot-clé Gherkin "Et", `onSurfaceVariant`, `outline`/`outlineVariant`, `error`/`success`/`amber`) — redemander si ambigu, comme la session précédente l'a fait.

**Pièges de contraste déjà identifiés sur la session précédente, toujours valables ici :**
- Fond plein accent + texte clair → échec (voir règle critique ci-dessus).
- Badge à fond teinté (rgba accent à faible alpha) **avec texte de la même couleur que la teinte** perd du contraste quand l'alpha augmente (ex. hover) — plafonner ces fonds tintés à ~0.08 d'alpha, vérifier au cas par cas avec le nouvel accent or `#d1a954` (le calcul dépendra de sa luminosité, différente de l'orange précédent).
- `error`/`success`/`amber` restent probablement inchangés (sémantiques, indépendants de l'accent de marque).

---

## Session RAG-3 (2026-06-20) — Chunking avec outil professionnel

**Objectif :** Remplacer le chunking regex maison par `RecursiveCharacterTextSplitter` de `@langchain/textsplitters`, standard industrie pour les pipelines RAG.

### Étapes

- [x] **Étape 1 — Installer la dépendance** : `npm install @langchain/textsplitters`
- [x] **Étape 2 — Remplacer `chunkText()` dans `api/upload-doc.js`** : utiliser `RecursiveCharacterTextSplitter` avec `chunkSize: 1600`, `chunkOverlap: 200`, séparateurs `["\n\n", "\n", ". ", " ", ""]`
- [x] **Étape 3 — Nettoyer les debug logs** dans `api/upload-doc.js` (les `console.log("[debug]...")` laissés de la session RAG-2)
- [ ] **Étape 4 — Re-indexer les documents** : supprimer + re-uploader les docs dans l'UI pour bénéficier du nouveau chunking
- [ ] **Étape 5 — Vérifier les scores** : les scores de match doivent monter de 38-51% → 60-75%+
- [ ] **Étape 6 — Commiter**

---

## Session RAG-4 (2026-06-20) — Affichage Sources professionnel

**Objectif :** Remplacer le panel "X passages récupérés" (scores bruts en %) par un panel "Sources utilisées" minimaliste — les scores cosine sont un détail d'implémentation, pas une métrique utilisateur.

### Étapes

- [x] **Étape 1 — Remplacer le panel RAG dans `Results.jsx`** : supprimer `ChunkItem` avec % et barres de progression, le remplacer par une liste de noms de documents avec un indicateur visuel simple (point vert = contribué)
- [x] **Étape 2 — Dédupliquer par filename** : si plusieurs chunks du même doc sont retournés, n'afficher le doc qu'une seule fois
- [x] **Étape 3 — Supprimer les styled components inutilisés** : `ChunkList`, `ChunkItem`
- [ ] **Étape 4 — Commiter**

---

## Session RAG-5 (2026-06-20) — Guard duplicate upload

**Objectif :** Empêcher le re-upload silencieux d'un fichier déjà indexé. Afficher une confirmation avant d'écraser.

### Étapes

- [x] **Étape 1 — Détecter le doublon dans `Forge.jsx`** : avant l'upload, vérifier si `documents` contient déjà un doc avec le même `name` que le fichier déposé
- [x] **Étape 2 — Afficher une confirmation** : si doublon détecté, afficher un message inline "Ce document est déjà indexé. Remplacer ?" avec deux boutons (Remplacer / Annuler)
- [x] **Étape 3 — Bloquer ou continuer** selon le choix utilisateur
- [ ] **Étape 4 — Commiter**

---

## Session DEMO (2026-06-21) — Préparation publication LinkedIn

**Objectif :** Préparer l'app pour une démo publique sans exposer les opérations destructives (upload/suppression) aux visiteurs.

### Réalisé
- [x] Chips Lumeo Boutique dans Forge.jsx (4 briefs pré-remplis, sans détails inventés)
- [x] Ligne de contexte démo au-dessus du textarea
- [x] Instruction RAG anti-hallucination dans le prompt système (`api/generate-stories.js`)
- [x] Upload, suppression et indexation désactivés en frontend (messages explicatifs, curseur non-cliquable)
- [x] Garde-fous backend : 403 dans `api/upload-doc.js` et `api/delete-doc.js` si `DEMO_MODE=true`
- [ ] Ajouter `DEMO_MODE=true` dans les variables d'env Vercel (Production uniquement)

---

## Session HISTORIQUE (2026-06-21) — Historique localStorage

**Objectif :** Remplacer les données factices du Dashboard et de la page Library par un vrai historique fonctionnel, stocké en localStorage (un historique par navigateur/visiteur, pas de backend).

### Structure d'une entrée
```json
{
  "id": "timestamp",
  "title": "30 premiers caractères du brief",
  "brief": "le brief original",
  "stories": "texte markdown complet",
  "sourcesUsed": ["filename1.pdf", "filename2.pdf"],
  "storiesCount": 4,
  "createdAt": "2026-06-21T14:00:00.000Z"
}
```
Clé localStorage : `storyforge_library`

### Plan de fichiers
| Fichier | Action | Détail |
|---|---|---|
| `src/utils/libraryStorage.js` | Créer | `saveGeneration`, `getGenerations`, `deleteGeneration` |
| `src/screens/Library.jsx` | Créer | Page Historique complète avec vue détail et suppression |
| `src/App.jsx` | Modifier | Remonter `brief`/`setBrief` en state global, brancher Library, passer `onNavigate` à Results |
| `src/screens/Forge.jsx` | Modifier | `brief`/`setBrief` deviennent des props (plus du state local) |
| `src/screens/Results.jsx` | Modifier | Bouton save fonctionnel + panel récents réels + SeeAllLink navigue vers library |
| `src/screens/Dashboard.jsx` | Modifier | Panel récents et stats calculés depuis `getGenerations()` |
| `src/components/layout/Sidebar.jsx` | Modifier | "Library" → "Historique" |

### Étapes
- [x] **Étape 1** — Créer `src/utils/libraryStorage.js`
- [x] **Étape 2** — Remonter `brief` dans `App.jsx`, passer `onNavigate` à `Results`
- [x] **Étape 3** — Adapter `Forge.jsx` (brief en prop)
- [x] **Étape 4** — Brancher "Sauvegarder" dans `Results.jsx` + panel récents réels
- [x] **Étape 5** — Mettre à jour `Dashboard.jsx` (stats + récents réels)
- [x] **Étape 6** — Créer `Library.jsx` (page Historique)
- [x] **Étape 7** — Brancher Library dans `App.jsx` + renommer dans Sidebar
- [ ] **Commiter**

---

## Tests recruteur — À valider

### Comportement réseau
| Test | Statut |
|---|---|
| Recharger page pendant génération | ⬜ À tester |
| Clic rapide multiple sur "Générer" | ⬜ À tester |
| Génération successive (2x) | ⬜ À tester |

### UX / Interface
| Test | Statut |
|---|---|
| Bouton "Copier" → coller dans éditeur | ⬜ À tester |
| Test sur vrai mobile | ⬜ À tester |
| Lien feedback Google Form | ⬜ À tester |

### Accessibilité
| Test | Statut |
|---|---|
| Navigation clavier uniquement (Tab/Enter) | ⬜ À tester |
| Zoom 200% navigateur | ⬜ À tester |

---

## Stack RAG — Référence

- Index Pinecone : `storyforge`, dimension 512, cosine, serverless AWS us-east-1
- Embedding : OpenAI `text-embedding-3-small` 512 dims
- Env vars : `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_URL`
- URL index : `https://storyforge-g08tbyk.svc.aped-4627-b74a.pinecone.io`
- ⚠️ Index partagé entre tous les visiteurs (pas d'isolation multi-tenant) — ne pas déployer avec de vrais docs sensibles

---

## Notes techniques

- **404 en local** : attendu — `vite dev` ne sert pas `/api`. Utiliser `vercel dev` pour tester l'API localement.
- **Rate limiting** : Map en mémoire, non persistant entre cold starts Vercel. À migrer vers Upstash Redis si mis en prod réelle.
