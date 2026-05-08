# 📖 StoryForge AI

**Générateur intelligent de user stories avec streaming en temps réel**

Un outil IA qui transforme un brief métier en user stories formatées, avec critères d'acceptation, complexité et scénarios Gherkin — le tout généré par Claude en streaming.

---

## ✨ Features

- ✅ **Streaming en temps réel** : Voir la génération des user stories au fur et à mesure (UX fluide)
- ✅ **Format structuré** : 3 user stories avec "En tant que / Je veux / Afin de"
- ✅ **Critères d'acceptation** : 2 critères par story pour la qualité
- ✅ **Complexité estimée** : Sizing S/M/L intégré
- ✅ **Scénarios Gherkin** : 2 scénarios BDD en français (Étant donné / Quand / Alors)
- ✅ **Gestion d'erreurs robuste** : Validation input, timeouts, messages d'erreur clairs
- ✅ **UX réfléchie** : Copy-to-clipboard, loading state, dark mode ready
- ✅ **API key sécurisée** : Configuration via .env, jamais exposée

---

## 🛠 Stack Technique

| Technologie | Version | Rôle |
|------------|---------|------|
| **React** | 18+ | Framework UI |
| **Vite** | 5+ | Bundler ultra-rapide |
| **styled-components** | 6+ | CSS-in-JS |
| **react-markdown** | 9+ | Rendu Markdown |
| **Claude API** | Sonnet 4 | Génération IA |

---

## 🚀 Mise en place

### Prérequis
- Node.js 18+
- Une clé API Anthropic Claude ([obtenez-la ici](https://console.anthropic.com/))

### Installation

```bash
# Clone le projet
git clone https://github.com/eden-sahile/storyforge-ai.git
cd storyforge-ai

# Installe les dépendances
npm install

# Configure ta clé API
cp .env.example .env.local
# Édite .env.local et ajoute ta clé API
```

### Développement

```bash
npm run dev
# Ouvre http://localhost:5173
```

### Build pour production

```bash
npm run build
npm run preview
```

---

## 📋 Utilisation

1. **Écris un brief métier** dans la textarea
   - Exemple : *"Je veux permettre aux libraires de gérer leurs inventaires en temps réel avec notifications"*

2. **Clique "Générer les user stories"** (ou Ctrl+Entrée)

3. **Regarde le streaming** : Les user stories s'affichent en temps réel

4. **Copie le résultat** : Utilise le bouton "📋 Copier" pour exporter

---

## 🔍 Détails Techniques

### Architecture

```
StoryForge/
├── App.jsx                 # Composant principal, gestion état
├── BriefInput.jsx          # Textarea + button
├── StoriesOutput.jsx       # Rendu Markdown + copy button
├── claudeService.js        # Service API Claude (streaming, erreurs)
├── .env.example           # Template env
└── package.json           # Dépendances
```

### Flow de données

```
User Input (textarea)
    ↓
BriefInput → handleSubmit
    ↓
App.jsx → generateStories()
    ↓
claudeService.js → Claude API (streaming)
    ↓
onChunk callback → setStories (accumule chunks)
    ↓
StoriesOutput → ReactMarkdown render
```

### Gestion des erreurs

L'app gère les cas suivants :
- ❌ Brief vide ou trop court (< 10 caractères)
- ❌ Clé API manquante ou invalide (401)
- ❌ Rate limiting Claude (429)
- ❌ Serveur indisponible (500)
- ❌ Timeout réseau (30s)
- ❌ Output trop long (> 4000 caractères)

Chaque erreur affiche un message utilisateur clair et actionnable.

### Optimisations

- **Streaming**: Les chunks arrivent en real-time (pas d'attente)
- **Buffer handling**: Gère les lignes incomplètes du streaming SSE
- **Timeouts**: 30 secondes max pour éviter les requêtes orphelines
- **Output limit**: Plafonne la réponse à 4000 chars (évite les freezes UI)
- **Debouncing**: Le bouton se désactive pendant la génération

---

## 💡 Lessons Learned

### Ce qui a bien marché

✅ **Streaming avec ReadableStream** : Beaucoup plus fluide qu'une réponse complète
✅ **Validation input côté client** : Évite les appels API inutiles
✅ **Messages d'erreur contextualisés** : Les utilisateurs savent quoi faire

### Challenges

⚠️ **Parsing SSE malformé** : Certaines lignes arrivent incomplètes en streaming → solution : buffer partiel
⚠️ **UX loading state** : Désactiver le bouton est crucial pour éviter les appels multiples
⚠️ **Output formatage** : Claude produit du Markdown, react-markdown doit l'interpréter correctement

---

## 🔗 Déploiement sur Vercel

### Configuration

1. **Push le projet sur GitHub**

```bash
git add .
git commit -m "feat: StoryForge AI MVP"
git push origin main
```

2. **Connecte Vercel à ton repo GitHub**
   - https://vercel.com/new
   - Sélectionne ton repo
   - Clique "Deploy"

3. **Ajoute la variable d'environnement**
   - Dans Vercel Dashboard → Settings → Environment Variables
   - Ajoute : `VITE_ANTHROPIC_API_KEY` = ta clé API

4. **Redéploie**
   - Vercel va rebuilder automatiquement

### Résultat

Ton app sera live sur : `https://storyforge-ai.vercel.app`

---

## 📊 Metrics

**Performance**
- ⚡ First Contentful Paint: ~800ms (Vite)
- ⚡ Time to Streaming: ~1-2s
- ⚡ Chunk latency: 50-200ms

**Limitations Claude API**
- Max tokens output: 1000
- Timeout: 30s
- Rate limit: 5 req/min (free tier)

---

## 🎯 Use Cases

### Pour les Product Owners
- Générer rapidement des user stories à partir de briefs métier
- Structurer les spécifications avant les estimations
- Avoir un format cohérent pour tout le backlog

### Pour les Equipes Agile
- Accélérer les sprint planning
- Normaliser la formulation des stories
- Réduire les allers-retours PO/Dev sur le formatage

### Pour les Consultants
- Démontrer comment l'IA peut accélérer la gestion produit
- Showcaser l'intégration Claude dans un workflow réel

---

## 🚧 Roadmap Future

- [ ] Intégration Jira : exporter les user stories directement dans Jira
- [ ] Génération de tests : créer les cas de test à partir des stories
- [ ] Historique : sauvegarder et revoir les générations précédentes
- [ ] Personnalisation du prompt : adapter le format (Scrum vs Kanban, etc.)
- [ ] Support multilingue : générer en FR/EN/ES
- [ ] Analytics : tracker les briefs les plus convertis

---

## 💬 Questions Fréquentes

**Q: Ma clé API est exposée dans les logs?**
A: Non. Vite cache les variables env en production. Elles ne remontent jamais aux logs serveur.

**Q: Pourquoi le streaming s'arrête parfois?**
A: C'est un timeout (30s) ou une limite Claude. Réessayez avec un brief plus court.

**Q: Peux-tu générer en d'autres langues?**
A: Oui, modifie simplement le prompt dans `claudeService.js`. Actuellement c'est en FR.

**Q: Combien ça coûte?**
A: Zéro pour toi. C'est facturé à la clé API utilisateur (quelques centimes par requête avec Sonnet).

---

## 📝 License

MIT © 2025 Eden Sahilé

---

## 🙋 Support

Des questions ou bugs? 
- 📧 Email: edensahile.pro@gmail.com
- 🔗 LinkedIn: [eden-sahile](https://www.linkedin.com/in/edensahile-99b088112)
- 💻 Portfolio: [edensahile.fr](https://edensahile.fr)

---

## 🎓 What I Learned

Ce projet m'a permis de :
- ✅ Approfondir React (hooks, state management)
- ✅ Implémenter le streaming SSE côté client
- ✅ Gérer les erreurs API et les edge cases
- ✅ Intégrer Claude API dans une véritable app
- ✅ Penser "product" : gestion erreurs, UX, messages clairs
- ✅ Préparer le déploiement production-ready

C'est le type de projet que j'aime : **petit mais complet, avec de vraies contraintes métier**.