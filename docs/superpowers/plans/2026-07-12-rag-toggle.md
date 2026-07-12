# Toggle "Générer sans RAG" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a StoryForge user manually skip RAG retrieval for a single generation, and remove the now-redundant fake "comparison" panel in Results.

**Architecture:** RAG retrieval already happens client-side in `Forge.jsx:handleSubmit` (a call to `retrieveContext(brief)` before `generateStories`). A local checkbox state (`ragDisabled`) gates that call — when checked, `contextChunks` stays `[]` and the rest of the pipeline (backend, Results badge) behaves exactly as it already does for an off-topic brief. No backend changes.

**Tech Stack:** React (hooks, no router — screens are switched by parent state), styled-components, Vitest + @testing-library/react.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-rag-toggle-design.md`
- Toggle default: unchecked (RAG enabled) on every mount of `Forge` — not persisted, not lifted to `App.jsx`.
- Visible and functional in `DEMO_MODE` (not a destructive action).
- No changes to `api/generate-stories.js` or `api/retrieve-context.js`.
- No changes to the RAG badge logic in `Results.jsx` (`ragChunks.length > 0` already covers this case correctly).
- Toggle label text: exactly `"Générer sans RAG (US génériques)"`.

---

### Task 1: Add the "Générer sans RAG" toggle to Forge

**Files:**
- Modify: `src/screens/Forge.jsx:296-310` (add styled component near `RestoreHint`), `src/screens/Forge.jsx:1055` (add state), `src/screens/Forge.jsx:1086-1094` (gate the `retrieveContext` call), `src/screens/Forge.jsx:1262-1268` (render the checkbox)
- Create: `src/test/Forge.test.jsx`

**Interfaces:**
- Consumes: `retrieveContext` from `src/components/services/ragService.js` (already imported in `Forge.jsx`), `generateStories` from `src/components/services/claudeService.js` (already imported).
- Produces: nothing new consumed by other tasks — Task 2 and Task 3 are independent of this task's internals.

- [ ] **Step 1: Write the failing tests**

Create `src/test/Forge.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Forge from '../screens/Forge';
import { retrieveContext } from '../components/services/ragService';
import { generateStories } from '../components/services/claudeService';

vi.mock('../components/services/ragService', () => ({
  retrieveContext: vi.fn().mockResolvedValue({ chunks: [] }),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

vi.mock('../components/services/claudeService', () => ({
  generateStories: vi.fn().mockResolvedValue(undefined),
}));

function renderForge() {
  return render(
    <Forge
      brief="Je veux gérer les retours produits pour mes clients"
      setBrief={vi.fn()}
      stories=""
      setStories={vi.fn()}
      ragChunks={[]}
      setRagChunks={vi.fn()}
      documents={[]}
      setDocuments={vi.fn()}
      setTruncated={vi.fn()}
      onNavigate={vi.fn()}
    />
  );
}

describe('Forge — toggle Générer sans RAG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('appelle retrieveContext par défaut (RAG activé)', async () => {
    renderForge();

    fireEvent.click(screen.getByRole('button', { name: /Générer les user stories/i }));

    await waitFor(() => expect(generateStories).toHaveBeenCalled());
    expect(retrieveContext).toHaveBeenCalledWith('Je veux gérer les retours produits pour mes clients');
  });

  it("n'appelle pas retrieveContext quand le toggle est coché", async () => {
    renderForge();

    fireEvent.click(screen.getByLabelText(/Générer sans RAG/i));
    fireEvent.click(screen.getByRole('button', { name: /Générer les user stories/i }));

    await waitFor(() => expect(generateStories).toHaveBeenCalled());
    expect(retrieveContext).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify the second one fails**

Run: `npx vitest run src/test/Forge.test.jsx`
Expected: first test (`appelle retrieveContext par défaut`) PASSES (current behavior already does this unconditionally). Second test (`n'appelle pas retrieveContext quand le toggle est coché`) FAILS with a "Unable to find a label with the text of: /Générer sans RAG/i" error, because the checkbox doesn't exist yet.

- [ ] **Step 3: Add the `RagToggleRow` styled component**

In `src/screens/Forge.jsx`, right after the `RestoreHint` styled component (ends at line 310 with `` ` `` `;`), add:

```jsx
const RagToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: ${theme.spacing.sm};
  color: ${theme.colors.onSurfaceVariant};
  font-size: ${theme.fontSizes.xs};
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    accent-color: ${theme.colors.primary};
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
`;
```

- [ ] **Step 4: Add the `ragDisabled` state**

In `src/screens/Forge.jsx`, find:

```jsx
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [ragOpen, setRagOpen] = useState(true);
```

Replace with:

```jsx
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState(null);
  const [ragDisabled, setRagDisabled] = useState(false);
  const [ragOpen, setRagOpen] = useState(true);
```

- [ ] **Step 5: Gate the `retrieveContext` call in `handleSubmit`**

Find:

```jsx
    let contextChunks = [];

    try {
      const ragResult = await retrieveContext(brief);
      contextChunks = ragResult.chunks || [];
      setRagChunks(contextChunks);
    } catch (err) {
      console.warn("RAG retrieval failed, generating without context:", err);
    }

    let hasError = false;
```

Replace with:

```jsx
    let contextChunks = [];

    if (!ragDisabled) {
      try {
        const ragResult = await retrieveContext(brief);
        contextChunks = ragResult.chunks || [];
        setRagChunks(contextChunks);
      } catch (err) {
        console.warn("RAG retrieval failed, generating without context:", err);
      }
    }

    let hasError = false;
```

- [ ] **Step 6: Render the checkbox**

Find:

```jsx
            {keepBrief && status === "idle" && (
              <RestoreHint>
                <span className="material-symbols-outlined">info</span>
                Brief précédent restauré — cliquez sur Générer pour relancer.
              </RestoreHint>
            )}

            <GenerateBtn
```

Replace with:

```jsx
            {keepBrief && status === "idle" && (
              <RestoreHint>
                <span className="material-symbols-outlined">info</span>
                Brief précédent restauré — cliquez sur Générer pour relancer.
              </RestoreHint>
            )}

            <RagToggleRow>
              <input
                type="checkbox"
                checked={ragDisabled}
                onChange={(e) => setRagDisabled(e.target.checked)}
              />
              Générer sans RAG (US génériques)
            </RagToggleRow>

            <GenerateBtn
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/test/Forge.test.jsx`
Expected: both tests PASS.

- [ ] **Step 8: Run the full test suite**

Run: `npx vitest run`
Expected: all test files pass (31 tests: the existing 29 plus the 2 new ones).

- [ ] **Step 9: Commit**

```bash
git add src/screens/Forge.jsx src/test/Forge.test.jsx
git commit -m "$(cat <<'EOF'
feat(forge): ajoute un toggle pour generer sans RAG

Une checkbox avant le bouton Generer permet de sauter l appel
retrieveContext() pour tester des US generiques sur un brief
par ailleurs pertinent. Non persiste, actif en mode demo.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Remove the fake comparison panel from Results

**Files:**
- Modify: `src/screens/Results.jsx:464-525` (remove 3 styled components), `src/screens/Results.jsx:823-828` (remove `GENERIC_STORIES`), `src/screens/Results.jsx:835` (remove `comparisonOpen` state), `src/screens/Results.jsx:1066-1085` (remove JSX block)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Confirm nothing else references the identifiers being removed**

Run: `grep -n "ComparisonToggle\|ToggleHeader\|ComparisonContent\|GENERIC_STORIES\|comparisonOpen" src/screens/Results.jsx`
Expected output (line numbers may vary slightly if Task 1 touched a different file, but for a fresh checkout the lines are):

```
465:const ComparisonToggle = styled.div`
471:const ToggleHeader = styled.button`
504:const ComparisonContent = styled.div`
824:const GENERIC_STORIES = `En tant qu'utilisateur, je veux me connecter afin d'accéder à mon compte.
835:  const [comparisonOpen, setComparisonOpen] = useState(false);
1067:          <ComparisonToggle>
1068:            <ToggleHeader
1069:              $open={comparisonOpen}
1070:              onClick={() => setComparisonOpen(!comparisonOpen)}
1076:            </ToggleHeader>
1077:            {comparisonOpen && (
1078:              <ComparisonContent>
1079:                <div style={{ whiteSpace: "pre-wrap" }}>{GENERIC_STORIES}</div>
1083:              </ComparisonContent>
1085:          </ComparisonToggle>
```

Confirm every match is one of these 4 declarations plus their JSX usage — no other component in the file references them. If anything else shows up, stop and re-plan; do not proceed with deletion.

- [ ] **Step 2: Remove the 3 styled components**

Find:

```jsx
// ─── RAG Comparison Toggle ────────────────────────────────
const ComparisonToggle = styled.div`
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: ${theme.radii.lg};
  overflow: hidden;
`;

const ToggleHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.md} ${theme.spacing.lg};
  background: rgba(239, 68, 68, 0.05);
  border: none;
  cursor: pointer;
  transition: background 0.2s;

  .left {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    font-size: ${theme.fontSizes.sm};
    font-weight: 600;
    color: #ef4444;
  }

  .chevron {
    font-family: "Material Symbols Outlined";
    font-size: 20px;
    color: ${theme.colors.onSurfaceVariant};
    transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0)")};
    transition: transform 0.2s;
  }

  &:hover {
    background: rgba(239, 68, 68, 0.08);
  }
`;

const ComparisonContent = styled.div`
  padding: ${theme.spacing.lg};
  background: rgba(239, 68, 68, 0.03);
  border-top: 1px solid rgba(239, 68, 68, 0.1);
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.onSurfaceVariant};
  line-height: 1.7;

  .warning {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    background: rgba(239, 68, 68, 0.1);
    border-radius: ${theme.radii.sm};
    color: #ef4444;
    font-weight: 600;
    font-size: ${theme.fontSizes.xs};
    margin-top: ${theme.spacing.md};
  }
`;

// ─── Right Column ─────────────────────────────────────────
```

Replace with:

```jsx
// ─── Right Column ─────────────────────────────────────────
```

- [ ] **Step 3: Remove `GENERIC_STORIES`**

Find:

```jsx
// ─── Generic stories for comparison ──────────────────────
const GENERIC_STORIES = `En tant qu'utilisateur, je veux me connecter afin d'accéder à mon compte.

En tant qu'administrateur, je veux gérer les accès afin de contrôler les utilisateurs.

En tant qu'utilisateur, je veux recevoir une facture afin de justifier mon achat.`;

// ─── Component ────────────────────────────────────────────
```

Replace with:

```jsx
// ─── Component ────────────────────────────────────────────
```

- [ ] **Step 4: Remove the `comparisonOpen` state**

Find:

```jsx
  const [showTrelloMsg, setShowTrelloMsg] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [recentGenerations, setRecentGenerations] = useState([]);
```

Replace with:

```jsx
  const [showTrelloMsg, setShowTrelloMsg] = useState(false);
  const [recentGenerations, setRecentGenerations] = useState([]);
```

- [ ] **Step 5: Remove the JSX block**

Find:

```jsx
          </StoryList>

          {/* Comparison Toggle */}
          <ComparisonToggle>
            <ToggleHeader
              $open={comparisonOpen}
              onClick={() => setComparisonOpen(!comparisonOpen)}
            >
              <div className="left">
                🔴 Sans RAG — voir la version générique (moins précise)
              </div>
              <span className="chevron">expand_more</span>
            </ToggleHeader>
            {comparisonOpen && (
              <ComparisonContent>
                <div style={{ whiteSpace: "pre-wrap" }}>{GENERIC_STORIES}</div>
                <div className="warning">
                  ❌ Aucun vocabulaire métier · Aucune règle de gestion · Identique à du ChatGPT générique
                </div>
              </ComparisonContent>
            )}
          </ComparisonToggle>
        </LeftColumn>
```

Replace with:

```jsx
          </StoryList>
        </LeftColumn>
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (no test referenced the removed panel — confirmed in the spec — so the count stays the same as after Task 1).

- [ ] **Step 7: Commit**

```bash
git add src/screens/Results.jsx
git commit -m "$(cat <<'EOF'
fix(results): supprime le panneau de comparaison RAG statique

Le panneau Sans RAG affichait 3 US codees en dur, jamais le vrai
brief soumis. Redondant depuis l ajout du vrai toggle dans Forge.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update context.md

**Files:**
- Modify: `context.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Add a session entry**

At the top of `context.md`, right after the title/date header (before the first `## Session` heading), add a new section:

```markdown
## Session RAG-TOGGLE (2026-07-12) — Toggle "Générer sans RAG"

**Branche :** `feat/polish`

**Objectif :** Permettre à un visiteur de désactiver volontairement le RAG pour une génération (test d'US génériques), même sur un brief par ailleurs pertinent. Spec : `docs/superpowers/specs/2026-07-12-rag-toggle-design.md`.

### Réalisé
- [x] Checkbox "Générer sans RAG (US génériques)" dans `Forge.jsx`, entre le textarea et le bouton Générer. State local `ragDisabled` (non persisté), saute l'appel `retrieveContext()` dans `handleSubmit` quand coché.
- [x] Suppression du panneau de comparaison statique dans `Results.jsx` (`GENERIC_STORIES`, `ComparisonToggle`/`ToggleHeader`/`ComparisonContent`) — affichait toujours les 3 mêmes US codées en dur, jamais le vrai brief.
- [x] Tests : 2 nouveaux tests dans `src/test/Forge.test.jsx` (comportement par défaut + toggle coché).

---
```

Also update the `*Mis à jour le ...*` date on the line right below the `# StoryForge AI — Contexte actif` title to `2026-07-12` (it may already be `2026-07-12` from the previous session — leave as-is if so).

- [ ] **Step 2: Commit**

```bash
git add context.md
git commit -m "$(cat <<'EOF'
docs: consigne la session toggle RAG dans context.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
