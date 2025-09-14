# Cleanup Plan & Execution Log

Branch: `chore/cleanup-20250823`
Date: 2025-08-23
Owner: Tech Lead

This document tracks the cleanup process: findings, decisions, and verifications per step.

## Step 2 — Inventory & Reports

Artifacts generated:
- Inventory: `scripts/inventory.json`
- Reports:
  - `reports/knip-report.json`
  - `reports/ts-prune-report.txt`
  - `reports/depcheck-report.json`
  - `reports/eslint-report.txt`
  - `reports/typescript-report.txt`

Notes:
- ESLint formatter warning: install `eslint-formatter-unix` or switch to default formatter. Current `reports/eslint-report.txt` may be empty due to formatter not installed.
- Depcheck “missing”:
  - `i18next` (used in `src/i18n.ts`) — should be added to dependencies
  - `@types/node` (referenced in tsconfigs) — add to devDependencies
- Depcheck/Knip list several dependencies as unused. Many are used in non-TS files (e.g., `api-server.js`, `functions/`) or optional targets. We will validate each before removal.

### Candidate Files for Removal/Move

Evidence sources: grep across workspace, `scripts/inventory.json`, `knip`, `ts-prune`.

| File | Reason | Evidence | Status |
| --- | --- | --- | --- |
| `admin/routes/AdminRoutes_new.tsx` | Empty file, not referenced | File content empty; grep shows no imports/usages | move to `_trash/` |
| `admin/pages/InstagramStoriesAdminPageNew.tsx` | Unused experimental page | Not imported anywhere; only referenced by unused `AdminRoutes_new.tsx` | move to `_trash/` |
| `admin/pages/MenuPage.tsx` | Legacy page superseded by `MenuPageNew.tsx` | grep finds no imports/usages | move to `_trash/` |
| `admin/pages/StoryManagement_New.tsx` | Experimental duplicate | Only referenced by unused `AdminRoutes_new.tsx`; no other imports | move to `_trash/` |
| `admin/components/SimpleFileUploader.tsx` | Legacy utility | grep finds no imports/usages | move to `_trash/` |
| `admin/components/TestFileUpload.tsx` | Test-only component | grep finds no imports/usages | move to `_trash/` |
| `src/components/Stories_New.tsx` | Duplicate/legacy of Stories | grep finds no imports; `ts-prune` flags exports unused | move to `_trash/` |

Potential API cleanups (not removing files, only exports if confirmed safe):
- `src/components/InstagramStoriesNew.tsx` — default export unused (ts-prune), but named export is used in `src/pages/Home.tsx`. Defer until after functional cleanup.

### Public/Assets Cleanup (planned)
- Enumerate all files in `public/` and `public/assets/` and cross-reference with grep to identify unused images/icons/fonts.
- Move candidates to `_trash/` with evidence before delete.

### Dependencies (planned)
- Add missing: `i18next`, `@types/node`.
- Review depcheck “unused” deps one by one, especially server-side ones (`express`, `firebase-admin`, `firebase-functions`, etc.) and mark keep/remove accordingly.

### Verification status (for this step)
- Inventory generated ✔︎
- Knip, ts-prune, depcheck, tsc ran ✔︎
- ESLint report captured but formatter missing — action item: install formatter ❗

## Step 3 — Diff Plan (proposed)

- Create `_trash/` at repo root.
- Move the following to `_trash/` (no code references):
  - `admin/routes/AdminRoutes_new.tsx`
  - `admin/pages/InstagramStoriesAdminPageNew.tsx`
  - `admin/pages/MenuPage.tsx`
  - `admin/pages/StoryManagement_New.tsx`
  - `admin/components/SimpleFileUploader.tsx`
  - `admin/components/TestFileUpload.tsx`
  - `src/components/Stories_New.tsx`
- No API surface changes for runtime components in this step.

After moving:
- Run `npm run typecheck`, `npm run lint`, and `npm run build`.
- If any reference appears, restore the file and mark KEEP with rationale.

## Step 3 — Executed Moves (dead code → _trash/)

Moved with evidence:

| File | Reason | Evidence | Status |
| --- | --- | --- | --- |
| admin/routes/AdminRoutes_new.tsx | Empty and unused | grep no refs; file was empty | moved to _trash |
| admin/components/TestFileUpload.tsx | Test helper, no importers | grep no refs; knip/ts-prune aligned | moved to _trash |
| src/components/Stories_New.tsx | Legacy duplicate of Stories | grep found no importers; ts-prune only local usage | moved to _trash |

Post-move verification (to run every step):
- npm run typecheck — ensure no missing imports
- npm run lint
- npm run build — ensure production build ok

Rollback plan:
- If any route/page requires a file, restore from `_trash/` and mark KEEP with rationale.

## Appendix — Commands Used

- Generate inventory
  - node ./scripts/generate-inventory.cjs
- Analyze
  - knip, ts-prune, depcheck, eslint, tsc (outputs in `reports/`)

