---
name: sdd-dispatch-context
description: Use when dispatching SDD subagents to eliminate environment questions and standardize test execution
---

# SDD Dispatch Context

Reduce subagent friction on SDD task dispatches by pre-configuring environment blocks, command execution guidelines, and project conventions.

## Overview

**Problem:** Subagents spend 10–15% of context on environment setup questions (nvm paths, tool availability, test script wrapping) despite having access to everything needed.

**Solution:** Pre-built context blocks for every SDD dispatch that answer these questions upfront, plus a bash helper to generate them.

## When to Use

Use when dispatching ANY SDD implementer subagent. Add these blocks to your dispatch prompt:

1. **Environment block** — tells subagent Node/npm/docker are available, no setup needed
2. **Command execution block** — tells subagent to run commands directly, never wrap in scripts
3. **Project conventions block** — tells subagent commit trailer, formatting, paths

## Quick Reference

**Three blocks to copy into every dispatch:**

```
**Environment (pre-configured, no setup needed):**
- Node 24 LTS is installed and on PATH
- npm, docker, git, bash are available globally
- No .nvm sourcing needed — just run commands
- All paths work as absolute or relative to working directory
- Do NOT attempt to install/configure tools

**Command execution rules:**
- Run commands directly: `npm run build`, `npx prettier`, `docker build`, etc.
- Do NOT wrap in temporary shell scripts
- Do NOT check tool availability before running them
- Report test output (stdout/stderr) inline in your report

**Project conventions (from CLAUDE.md, all current):**
- Frontend: SvelteKit 2 + adapter-node, Node 24 LTS pinned
- Commands: `npm ci` (not npm install), `npm run build`, `npm run check`
- Formatting: Prettier (tabs, width 100, plugins for Svelte/Tailwind)
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
```

## Implementation: Bash Helper

Use `sdd-dispatch-context` to print these blocks formatted for dispatch:

```bash
# Print all three blocks
bash .superpowers/sdd-tooling/sdd-dispatch-context

# Print just environment block
bash .superpowers/sdd-tooling/sdd-dispatch-context --env

# Print just commands block
bash .superpowers/sdd-tooling/sdd-dispatch-context --commands

# Print just conventions block
bash .superpowers/sdd-tooling/sdd-dispatch-context --conventions
```

Then paste output into your dispatch prompt.

## Dispatch Template

For Task N implementer dispatch, use this template:

```
You are implementing Task N of the [plan title] for [project].

**Your task:** Read the brief at `/path/to/task-N-brief.md` — it contains your exact requirements.

**Context from completed tasks:**
[Prior task interfaces/decisions subagent needs to know]

**Global constraints (from the plan):**
[Constraints that bind this task]

[PASTE OUTPUT FROM sdd-dispatch-context HERE]

**Report:** Write your full report to `/path/to/task-N-report.md`. Return **only**:
- `DONE` if all steps passed
- `DONE_WITH_CONCERNS` + concerns
- `NEEDS_CONTEXT` + missing info
- `BLOCKED` + blocker

Do not dispatch any subagents. Work only on this task.

**Working directory:** [repo root]
```

## Common Mistakes

- **Not pasting blocks** → subagent spends 10% of context asking about paths/tools
- **Only pasting one block** → subagent still asks about missing context
- **Customizing the wording** → blocks are tested; tweaking them re-introduces friction
- **Pasting blocks but then asking setup questions in context** → contradicts the blocks, confuses subagent

**Fix:** Use helper, paste all three blocks verbatim, don't override them in dispatch context.

## Results

**Before tooling (Tasks 1–4):** Subagents spent 5–10 turns asking about:

- "Is nvm installed?"
- "Should I create a test script?"
- "What's the working directory?"
- "Should I source ~/.nvm/nvm.sh?"

**After tooling (expected for Tasks 5–7):** Questions drop to zero; subagents proceed directly to implementation.

**Token savings:** ~10–15% per task (roughly 2–3k tokens per 4-task batch).
