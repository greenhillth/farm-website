# Implementer instructions (all tasks)

You are implementing one task of a plan that rebuilds the soil-tests page (`/soiltests`) of a SvelteKit 2 + Svelte 5 (runes) + Tailwind 4 farm app.

- Your task brief (named in your dispatch) is your requirements, with the exact values to use verbatim: every user-facing string character for character (typographic quotes ’ “ ” and dashes included), class names, props and test cases.
- Global constraints: `global-constraints.md` in this directory. They bind you.
- Specs, for design intent only when the brief is silent: `docs/superpowers/specs/2026-09-27-soil-tests-ux-design.md`, `docs/superpowers/specs/2026-09-27-ui-direction.md`.
- Before creating or editing any `.svelte` file or `.svelte.ts` module, load the `svelte:svelte-code-writer` skill and use its documentation lookup and autofixer; every `.svelte` file you change must come back clean from the autofixer. Before building visible UI, read `docs/superpowers/specs/2026-09-27-ui-direction.md` (and load `frontend-design:frontend-design` if that skill is available).
- Work ONLY in `/home/tom/gbros/farm-website/.claude/worktrees/soil-tests-ux` (branch `feat/soil-tests-ux`). Never touch `/home/tom/gbros/farm-website` itself or switch branches. Do not push. Never use bare `git stash`.
- Files you may touch: `src/routes/soiltests/**` and `src/lib/soil-tests/**`.
- Tests: `npx vitest run --project server <file>` for `*.test.ts`; `npx vitest run --project client <file>` for `*.svelte.test.ts` (headless Chromium; run `npx playwright install chromium` if it says Chromium is missing). Run the full `npm test` and `npm run check` once before committing. `npx prettier --write` the files you touch. `npx eslint src 2>&1 | tail -3` must not exceed 81 errors (unless the brief says otherwise).
- Commit messages end with a Co-Authored-By trailer.

## Before you begin / while working
If anything is unclear, ask (report NEEDS_CONTEXT). Don't guess. If the brief's code is wrong against the real codebase (an API that doesn't exist, a test that can't pass as written), make the smallest correction, and record it and why in your report as a deviation.

## Your job
Implement exactly what the brief specifies, following its TDD steps (see the tests fail, then pass). Verify, commit, self-review your own diff (completeness, names, YAGNI, existing patterns, tests verify real behaviour, pristine test output), report.

## You do not dispatch subagents
Do all the work yourself. Never spawn subagents, and never a reviewer; the controller reviews after you report.

## When stuck
Report BLOCKED or NEEDS_CONTEXT with specifics. Bad work is worse than no work.

## Report
Write your full report to the report file named in your dispatch: what you implemented, tests and results, TDD evidence (RED command + failing output, GREEN command + passing output), files changed, deviations from the brief, self-review findings, concerns.
Then reply with ONLY (under 15 lines): Status (DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT), commits (short SHA + subject), one-line test summary, concerns, report path.

If later resumed with review findings: fix, re-run the covering tests, append a fix report (changes, tests, command, output) to the same report file, commit, and reply with the same short contract.
