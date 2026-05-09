# SEC-003 Rate Limiting Documentation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the in-memory rate limiting limitation in code and README, then commit all pending Session 2 work and the SEC-003 docs in two clean commits.

**Architecture:** No new code. Two changes: an explanatory comment block in `api/generate-stories.js` and a "Known Limitations" section in `README.md`. `context.md` is updated to mark SEC-003 complete and close Session 3.

**Tech Stack:** Git, Markdown

---

## Files

- Modify: `api/generate-stories.js` — add comment above `requestCounts`
- Modify: `README.md` — add "Known Limitations" section before `## 🎓 What I Learned`
- Modify: `context.md` — check SEC-003 box, update Session 3 status

---

### Task 1: Commit all Session 2 changes

**Files:**
- Stage: `package.json`, `package-lock.json`, `vite.config.js`, `src/test/`, `src/components/BriefInput.jsx`

- [ ] **Step 1: Verify the pending changes are exactly what's expected**

```bash
git status
```

Expected output includes (unstaged/untracked):
- `M src/components/BriefInput.jsx`
- `M package.json`
- `M package-lock.json`
- `M vite.config.js`
- `?? src/test/`

- [ ] **Step 2: Run the test suite to confirm all 20 tests pass**

```bash
npm run test:run
```

Expected:
```
Test Files  3 passed (3)
      Tests  20 passed (20)
```

- [ ] **Step 3: Stage the Session 2 files**

```bash
git add package.json package-lock.json vite.config.js src/components/BriefInput.jsx src/test/
```

- [ ] **Step 4: Commit**

```bash
git commit -m "test: add Vitest setup and 20 unit tests"
```

Expected: commit created, `git status` shows only `context.md` staged (from earlier session).

---

### Task 2: Add inline comment to `api/generate-stories.js`

**Files:**
- Modify: `api/generate-stories.js` lines 1–13

- [ ] **Step 1: Replace the `requestCounts` declaration with a commented version**

In `api/generate-stories.js`, replace:

```js
const requestCounts = new Map();
```

With:

```js
// NOTE: In-memory rate limiting — process-scoped, not persistent.
// Vercel serverless functions are stateless: this Map resets on every cold start
// and redeployment. The 10 req / 15 min window is enforced per function instance,
// not globally across all instances.
// For persistent rate limiting in production, use Vercel KV (@vercel/kv)
// or Upstash Redis (@upstash/redis).
const requestCounts = new Map();
```

- [ ] **Step 2: Verify the file looks correct**

```bash
head -15 api/generate-stories.js
```

Expected: comment block followed by `const requestCounts = new Map();` and `function checkRateLimit`.

---

### Task 3: Add "Known Limitations" section to README.md

**Files:**
- Modify: `README.md` — insert before `## 🎓 What I Learned` (line 256)

- [ ] **Step 1: Insert the Known Limitations section**

In `README.md`, immediately before the `## 🎓 What I Learned` line, insert:

```markdown
## ⚠️ Known Limitations

### Rate limiting is not persistent

The rate limiter (10 req / 15 min per IP) uses an in-memory `Map` that resets on every Vercel cold start and redeployment. In practice, the window is enforced **per function instance**, not globally across all instances. For true persistent rate limiting in production, replace the in-memory Map with [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or [Upstash Redis](https://upstash.com/).

---

```

---

### Task 4: Update context.md

**Files:**
- Modify: `context.md`

- [ ] **Step 1: Mark SEC-003 as complete**

In `context.md`, replace:

```markdown
- [ ] **[SEC-003] Rate limiting volatile (Map en mémoire)**
```

With:

```markdown
- [x] **[SEC-003] Rate limiting volatile (Map en mémoire)**
```

- [ ] **Step 2: Add documentation note below SEC-003**

After the SEC-003 correction line (the line starting `  - Correction : migrer vers`), add:

```markdown
  - *Résolution : limitation documentée dans le code et le README — infrastructure upgrade différée*
```

- [ ] **Step 3: Update Session 3 status**

Replace:

```markdown
**Session 3 (à reprendre)** — 2 tâches restantes (voir ci-dessous)
```

With:

```markdown
**Session 3 (2026-05-09) — TERMINÉE ✅** — SEC-003 : limitation rate limiting documentée (code + README) ; TECH-005 TypeScript différé
```

- [ ] **Step 4: Update the remaining tasks table**

Replace the entire "Tâches restantes (session 3)" section:

```markdown
## Tâches restantes (session 3)

| Priorité | ID | Effort | Notes |
|----------|----|--------|-------|
| 1 | SEC-003 | ~2h | Rate limiting persistant — nécessite Vercel KV ou Upstash Redis |
| 2 | TECH-005 | ~1j | Migration TypeScript — progressive, commencer par claudeService.js |
```

With:

```markdown
## Tâches différées

| ID | Notes |
|----|-------|
| TECH-005 | Migration TypeScript (~1j) — commencer par claudeService.js quand opportun |
```

---

### Task 5: Commit SEC-003 documentation

**Files:**
- Stage: `api/generate-stories.js`, `README.md`, `context.md`, `docs/superpowers/`

- [ ] **Step 1: Stage all SEC-003 changes**

```bash
git add api/generate-stories.js README.md context.md docs/
```

- [ ] **Step 2: Verify staged files**

```bash
git diff --staged --stat
```

Expected: `api/generate-stories.js`, `README.md`, `context.md`, and the `docs/` spec/plan files.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: document SEC-003 rate limiting limitation"
```

Expected: commit created, `git status` shows clean working tree.

- [ ] **Step 4: Final check**

```bash
npm run test:run
```

Expected:
```
Test Files  3 passed (3)
      Tests  20 passed (20)
```
