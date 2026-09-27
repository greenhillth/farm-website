#!/usr/bin/env python3
"""Diff each code block in a task brief against the committed file it names.

Usage: brief-vs-code.py BRIEF [REPO]
A block is attributed to the last backticked src/... path mentioned before it.
Blocks for the same file: the last one wins (plans often show a file in full once).
"""
import difflib, os, re, sys

brief, repo = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else '.')
text = open(brief, encoding='utf-8').read()
path_re = re.compile(r'`((?:src|scripts)/[^`\s]+\.(?:ts|svelte|js|mjs))`')
blocks = {}
last_path, pos = None, 0
for m in re.finditer(r"^```([a-z]*)\n(.*?)^```[ \t]*$", text, re.S | re.M):
    for p in path_re.finditer(text, pos, m.start()):
        last_path = p.group(1)
    pos = m.end()
    if last_path and m.group(1) in ('', 'ts', 'typescript', 'svelte', 'js', 'javascript'):
        blocks.setdefault(last_path, []).append(m.group(2))

for path, bodies in blocks.items():
    full = os.path.join(repo, path)
    if not os.path.exists(full):
        print(f'== {path}: MISSING in repo ({len(bodies)} block(s))')
        continue
    actual = open(full, encoding='utf-8').read()
    body = bodies[-1]
    if body.strip() == actual.strip():
        print(f'== {path}: identical to brief')
        continue
    if all(b.strip() in actual for b in bodies):
        print(f'== {path}: brief snippet(s) contained verbatim')
        continue
    diff = list(difflib.unified_diff(body.splitlines(), actual.splitlines(),
                                     'brief', 'repo', n=1, lineterm=''))
    print(f'== {path}: {len(diff)} diff lines (brief last block vs repo)')
    print('\n'.join(diff[:400]))
