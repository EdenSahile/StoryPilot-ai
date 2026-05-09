# SEC-003 — Rate Limiting Documentation

*Session 3 — StoryForge AI audit*

## Context

The current rate limiter uses an in-memory `Map` (`requestCounts`) in `api/generate-stories.js`. Because Vercel serverless functions are stateless, this Map is process-scoped: it resets on every cold start and redeployment. In practice, the 10 req / 15 min window is not enforced reliably across invocations in production.

The chosen resolution is to document this limitation clearly rather than introduce external infrastructure (Vercel KV, Upstash Redis). This is appropriate for a personal/low-traffic project where rate limiting serves as a basic abuse deterrent, not a hard security boundary.

## Changes

### 1. Inline comment — `api/generate-stories.js`

A comment block above the `requestCounts` declaration and `checkRateLimit` function explaining:
- The Map is process-scoped and resets on every cold start / redeployment
- What this means in practice (the window is per-instance, not global)
- The recommended upgrade path: Vercel KV or Upstash Redis

### 2. README — Known Limitations section

A new "Known Limitations" section added near the bottom of `README.md` with one entry covering the rate limiting behavior. Audience: any developer deploying or forking the project.

### 3. context.md update

- `SEC-003` checkbox marked `[x]`
- Note appended: "documented — infrastructure upgrade deferred"
- Session 3 status updated to TERMINÉE

### 4. Commits (two, in order)

**Commit 1** — `test: add Vitest setup and 20 unit tests`
All Session 2 changes: `package.json`, `package-lock.json`, `vite.config.js`, `src/test/`, `src/components/BriefInput.jsx` (`onKeyDown` fix).

**Commit 2** — `docs: document SEC-003 rate limiting limitation`
SEC-003 changes only: inline comment in `api/generate-stories.js`, "Known Limitations" section in `README.md`, `context.md` update.

## Out of scope

- No Vercel KV or Upstash Redis integration
- No TECH-005 TypeScript migration (deferred)
- No changes to the rate limiting logic itself (window, threshold)
