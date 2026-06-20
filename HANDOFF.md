# Handoff — StoryForge AI v3 (RAG)

**Branche active :** `feat/rag-upload`
**Date :** Session du 16 juin 2026

---

## ✅ Ce qui a été fait et fonctionne

### Infrastructure RAG
- Compte OpenAI créé, clé API active, budget projet fixé à $5/mois
- Index Pinecone `storyforge` créé : dimension 512, metric cosine, embedding model `text-embedding-3-small`, serverless AWS Virginia
- Variables d'environnement ajoutées dans Vercel (Production + Preview) : `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_URL`

### Pipeline d'upload et indexation
- `api/upload-doc.js` : reçoit un fichier en base64, extrait le texte (PDF via `unpdf`, DOCX via `mammoth`, TXT natif), chunk le texte (~500 tokens/chunk), génère les embeddings via OpenAI, upsert dans Pinecone
- `src/components/services/ragService.js` : client front avec `uploadDocument()`, `retrieveContext()` et `deleteDocument()`
- Upload réel testé et validé avec un PDF de 2808 caractères → 2 chunks créés, indexés avec succès dans Pinecone (scores de similarité visibles : 0.9997 et 0.7751 sur requête de test)

### Retrieval et génération contextualisée
- `api/retrieve-context.js` : embed le brief utilisateur, query Pinecone (topK=5, seuil de pertinence >30%), retourne les chunks avec score
- `api/generate-stories.js` modifié pour injecter les chunks RAG dans le prompt système avant l'appel Claude
- Le panel RAG dans `Forge.jsx` affiche bien les chunks récupérés avec score de match en temps réel pendant la génération

### Suppression de documents
- `api/delete-doc.js` créé : supprime tous les chunks d'un document via filtre metadata `filename`
- Bouton supprimer ajouté dans les DocCards de la Knowledge Base (`Forge.jsx`), avec confirmation avant suppression
- Fonction `deleteDocument()` ajoutée à `ragService.js`

### Documents de test
- PDF fictif `cahier_des_charges_bookflow.pdf` généré pour les démos publiques (contenu 100% inventé, vocabulaire métier riche : EDI ORDERS, comptes institutionnels, facturation INVOIC EDIFACT D96A, ISBN/ONIX)

### Bugs résolus pendant la session
1. `pdf-parse` incompatible avec le runtime serverless Vercel (`ERR_MODULE_NOT_FOUND`) → remplacé par `unpdf`
2. Conflit de nom : la fonction locale `extractText` collisionnait avec l'import `extractText` de `unpdf` → renommé en `extractPdfText`
3. `PineconeArgumentError: Must pass in at least 1 record to upsert` malgré des vecteurs valides → le SDK Pinecone v7 attend `{ records: batch }` et non `batch` directement en argument de `.upsert()`

---

## ❌ Ce qui ne fonctionne pas encore / problèmes ouverts

### 1. Pas de listing des documents au chargement de la page
Le state `documents` dans `Forge.jsx` est local et se réinitialise à chaque rechargement de page ou navigation. Les fichiers existent bien côté Pinecone (persistés), mais le front ne les recharge jamais au montage du composant. **Conséquence : la Knowledge Base apparaît toujours vide après un refresh, même si des documents sont indexés en base.**

**Ce qu'il manque :** une fonction `api/list-docs.js` qui interroge Pinecone pour reconstruire la liste des documents déjà indexés, appelée dans un `useEffect` au montage de `Forge.jsx`.

### 2. Scores de pertinence RAG relativement bas
Sur le brief de test "Je veux gérer les accès des vendeurs dans mon compte librairie", les scores obtenus étaient 65%, 53%, 47%, 39% — corrects mais pas excellents. Cause probable : le PDF BookFlow n'a été découpé qu'en quelques chunks larges, ce qui dilue la pertinence sémantique de chaque chunk.

**Piste d'amélioration :** chunker en respectant les sections du document (découpage sur les titres/headers plutôt que sur un nombre de tokens fixe).

### 3. Pollution croisée entre documents de test
Pendant les tests, un PDF sans rapport avec BookFlow uploadé en tout début de session est resté indexé dans Pinecone et polluait les résultats. **Il faut vérifier/nettoyer l'index Pinecone avant toute démo publique.**

### 4. Aucune isolation des données entre utilisateurs ⚠️
L'index Pinecone `storyforge` est unique et partagé par tous les visiteurs du lien public. Sans authentification ni namespace par session :
- N'importe quel visiteur peut uploader dans la même base
- N'importe quel visiteur peut **supprimer les documents des autres** via le bouton supprimer
- Le contenu des chunks est visible dans le panel RAG, donc potentiellement exposé publiquement

**Ne pas publier le lien démo publiquement avec de vrais documents tant que ce point n'est pas traité.** Pour les démos LinkedIn, utiliser uniquement le PDF fictif BookFlow, ou privilégier des captures d'écran/vidéo.

---

## 🔜 Prochaine session — priorités

1. **Créer `api/list-docs.js`** + brancher le chargement au montage de `Forge.jsx` (`useEffect`)
2. **Nettoyer l'index Pinecone** — supprimer tous les documents de test avant toute démo publique
3. **Décider d'une stratégie d'isolation** : namespace Pinecone par session (propre) ou démo interne uniquement avec le PDF fictif (simple)
4. **Améliorer le chunking** si le temps le permet — découpage par section plutôt que par tokens fixes
5. Une fois 1 à 3 réglés : merger `feat/rag-upload` → `main`, mettre à jour le README, publier la démo RAG sur LinkedIn

---

## Fichiers créés ou modifiés dans cette session

```
api/upload-doc.js                            (nouveau)
api/retrieve-context.js                      (nouveau)
api/delete-doc.js                            (nouveau)
api/generate-stories.js                      (modifié — injection contexte RAG)
src/components/services/ragService.js        (nouveau)
src/components/services/claudeService.js     (modifié — accepte contextChunks)
src/screens/Forge.jsx                        (modifié — state réel, upload/delete handlers, RAG chunks)
package.json                                 (+ openai, @pinecone-database/pinecone, unpdf, mammoth)
```

## Variables d'environnement requises (Vercel + .env)

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_URL=https://storyforge-xxxxx.svc.aped.pinecone.io
```
