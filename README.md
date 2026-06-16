# StoryForge AI

**Générateur de user stories contextualisé par IA — pour les Product Owners qui veulent des specs précises, pas des généricités.**

StoryForge transforme un brief métier en user stories structurées avec critères d'acceptation, estimation de complexité et scénarios Gherkin multi-cas — le tout généré par Claude en streaming temps réel.

🔗 **[Démo live](https://story-forge-ai-blond.vercel.app)** · 💼 **[Eden IA Studio](https://www.linkedin.com/in/edensahile-99b088112)**

---

## Ce que fait StoryForge

Un PO écrit un brief en langage naturel. StoryForge génère instantanément des user stories complètes, prêtes à intégrer dans un backlog Jira/Linear :

- **Statement** structuré : En tant que / Je veux / Afin de
- **Description métier** : contexte fonctionnel détaillé
- **Critères d'acceptation** : 4-6 critères précis et testables
- **Scénarios Gherkin** : plusieurs scénarios par story (happy path + edge cases)
- **Complexité** : estimation S / M / L

Le tout arrive en streaming — l'utilisateur voit la génération en temps réel.

---

## Screens

### Dashboard
Vue d'ensemble avec statistiques de génération, historique des sessions récentes et accès rapide à la Forge.

### Forge
L'écran principal. Deux colonnes : le brief à gauche, la base de connaissance à droite. Pendant la génération, les chunks RAG récupérés s'affichent avec leur score de pertinence, et le résultat stream en direct.

### Results
Les user stories parsées et structurées en cards visuelles. Chaque card affiche le statement colorisé, la description, les critères avec checkmarks, et les scénarios Gherkin avec coloration syntaxique (Étant donné / Quand / Alors / Et). Un toggle permet de comparer avec une version générique sans RAG.

---

## Stack technique

| Technologie | Rôle |
|---|---|
| React 18 + Vite | Framework UI + bundler |
| styled-components | CSS-in-JS, design tokens centralisés |
| Claude API (Sonnet) | Génération IA en streaming SSE |
| Vercel | Déploiement + serverless functions |

---

## Architecture

```
src/
├── theme.js                          # Design tokens (couleurs, spacing, fonts)
├── App.jsx                           # Router + state partagé
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx               # Navigation desktop
│   │   └── BottomNav.jsx             # Navigation mobile
│   ├── services/
│   │   └── claudeService.js          # Client API Claude (streaming SSE)
│   ├── BriefInput.jsx                # Composant textarea (legacy v1)
│   ├── StoriesOutput.jsx             # Rendu markdown (legacy v1)
│   ├── ErrorBoundary.jsx             # Catch erreurs React
│   └── Footer.jsx
├── screens/
│   ├── Dashboard.jsx                 # Stats + historique
│   ├── Forge.jsx                     # Brief + KB + streaming
│   └── Results.jsx                   # Stories structurées + Gherkin
└── styles/

api/
└── generate-stories.js               # Vercel serverless — proxy Claude API
```

### Flow de données

```
[Dashboard] → clic "New Story"
     ↓
[Forge] → brief + base de connaissance
     ↓  clic "Générer"
[Forge loading] → chunks RAG affichés + streaming result
     ↓  génération terminée
[Results] → stories parsées en cards structurées
     ↓  clic "Nouvelle génération"
[Forge] ← retour
```

---

## Installation

```bash
git clone https://github.com/EdenSahile/StoryForgeAI.git
cd StoryForgeAI
npm install
```

### Variables d'environnement

```bash
cp .env.example .env.local
```

Ajoute ta clé API Anthropic dans `.env.local` :

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Développement

```bash
# Avec Vercel CLI (recommandé — les serverless functions marchent)
npm i -g vercel
vercel dev

# Ou sans l'API (front uniquement)
npm run dev
```

### Déploiement

Push sur `main` → Vercel déploie automatiquement. Ajoute `ANTHROPIC_API_KEY` dans Vercel → Settings → Environment Variables (Production + Preview).

---

## Gestion des erreurs

- Brief vide ou trop court (< 10 caractères)
- Clé API manquante ou invalide (401)
- Rate limiting Claude (429)
- Timeout réseau (30s)
- Modèle indisponible (500)

Chaque erreur affiche un message clair et actionnable.

---

## Roadmap

### v2 — UI complète ✅
- [x] Dashboard avec stats et historique
- [x] Forge : brief + base de connaissance + streaming
- [x] Results : cards structurées + Gherkin multi-scénarios
- [x] Navigation sidebar desktop + bottom nav mobile
- [x] Design tokens centralisés (theme.js)
- [x] Prompt enrichi : description + critères + Gherkin

### v3 — RAG contextuel (en cours)
- [ ] Upload documents client (PDF, Word, TXT)
- [ ] Chunking + embeddings via OpenAI
- [ ] Stockage vectoriel Pinecone
- [ ] Retrieval sémantique sur le brief
- [ ] Stories ancrées dans le vocabulaire et les contraintes du client
- [ ] Persistence des générations dans Supabase

### v4 — Intégrations
- [ ] Export Jira / Trello
- [ ] Historique réel des générations (Library)
- [ ] Support multilingue (FR/EN)

---

## Pourquoi ce projet

StoryForge n'est pas un wrapper ChatGPT. C'est un outil de Product Owner conçu par une PO.

La v3 avec RAG est ce qui fait la différence : un client alimente l'outil avec ses docs métier, et les user stories générées utilisent **son vocabulaire, ses règles de gestion, ses contraintes techniques** — pas des généricités.

C'est exactement le pattern qu'une entreprise a vendu 20 000€ pour automatiser les réponses aux appels d'offres. StoryForge applique la même approche à la rédaction de specs produit.

---

## Auteur

**Eden Sahilé** — PO technique & AI Product Builder

- 🔗 [LinkedIn](https://www.linkedin.com/in/edensahile-99b088112)
- 💻 [Eden IA Studio](https://edensahile.fr)
- 📧 edensahile.pro@gmail.com

---

© 2025-2026 Eden Sahilé