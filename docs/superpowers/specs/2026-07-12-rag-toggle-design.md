# Toggle "Générer sans RAG" — Design

*Session 2026-07-12 — branche `feat/polish`*

## Context

StoryForge déclenche automatiquement le RAG quand le brief est jugé pertinent par rapport aux documents indexés (seuil de score 0.42, cf. `api/retrieve-context.js`). Un visiteur de la démo qui souhaite volontairement tester une génération d'US génériques (sans RAG) sur un brief par ailleurs pertinent (ex. contexte Lumeo Boutique) n'a aujourd'hui aucun moyen de le faire — le RAG se déclenche automatiquement dès que le score de pertinence dépasse le seuil.

Par ailleurs, `Results.jsx` affiche déjà un panneau "Sans RAG — voir la version générique" (`ComparisonToggle`), mais celui-ci montre 3 user stories statiques codées en dur (`GENERIC_STORIES`), jamais une vraie génération sur le brief réellement soumis. Ce panneau devient trompeur une fois un vrai contrôle disponible.

## Changes

### 1. `src/screens/Forge.jsx` — toggle "Générer sans RAG"

- Nouveau state local : `const [ragDisabled, setRagDisabled] = useState(false)`. Non levé dans `App.jsx`, non persisté — repart à `false` (RAG activé) à chaque montage de `Forge`, par choix délibéré : on ne veut pas qu'un visiteur oublie qu'il a désactivé le RAG lors d'une session future.
- Contrôle UI (checkbox stylée avec les tokens du thème `Pétrole & or`) placé entre `TextareaWrapper` et `GenerateBtn`, à côté/en remplacement visuel du `RestoreHint` existant dans le même emplacement. Libellé : **"Générer sans RAG (US génériques)"**.
- Dans `handleSubmit` : le bloc

  ```js
  try {
    const ragResult = await retrieveContext(brief);
    contextChunks = ragResult.chunks || [];
    setRagChunks(contextChunks);
  } catch (err) { ... }
  ```

  est sauté entièrement quand `ragDisabled === true` — `contextChunks` reste `[]` et est passé tel quel à `generateStories`. Aucun changement côté `api/generate-stories.js` ni `api/retrieve-context.js` : le backend ne voit simplement aucun `contextChunks`, exactement comme dans le cas où le score de pertinence est sous le seuil aujourd'hui.
- Visible et actif en `DEMO_MODE` — contrairement à l'upload/la suppression de documents (bloqués en démo), ce contrôle n'est pas destructif et ne touche pas à l'infrastructure RAG partagée.

### 2. `src/screens/Results.jsx` — suppression du panneau fake

Suppression complète de :
- la constante `GENERIC_STORIES`
- les styled components `ComparisonToggle`, `ComparisonContent`, `ToggleHeader` (et tout style associé uniquement utilisé par eux)
- le state `comparisonOpen`
- le bloc JSX `{/* Comparison Toggle */}` correspondant

Aucun changement au badge "RAG actif" / "RAG non utilisé — US Générique" (`Results.jsx:909`) : sa logique (`ragChunks.length > 0`) reflète déjà correctement une génération faite avec le toggle désactivé, sans distinction nécessaire entre "hors-sujet" et "désactivé manuellement".

### 3. Tests

Un test ciblé vérifiant que `retrieveContext` (mocké) n'est pas appelé quand le toggle "sans RAG" est activé avant de cliquer sur "Générer". Pas de suite `Forge.test.jsx` complète créée à cette occasion — seul le comportement nouveau est testé, conformément à la portée de cette tâche.

### 4. context.md

Entrée de session ajoutée documentant le changement, une fois implémenté.

## Out of scope

- Pas de comparatif côte-à-côte (deux générations réelles affichées ensemble) — option écartée au profit du toggle simple, moins coûteuse en appels API.
- Pas de modification du `ModeHint` (copie démo Lumeo Boutique).
- Pas de persistance du choix du toggle entre générations ou entre sessions.
- Pas de distinction visuelle dans le badge Results entre "RAG non utilisé (hors-sujet)" et "RAG désactivé manuellement".
