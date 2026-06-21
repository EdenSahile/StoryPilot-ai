# StoryForge AI — Contexte actif
*Mis à jour le 2026-06-21*

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
