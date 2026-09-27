#!/usr/bin/env python3
"""Write the code blocks of a task brief to the files they belong to.

Usage: extract-code.py BRIEF [PATH ...]   (run from the repo root)
A block belongs to the last backticked src/... path mentioned before it; when a
file has several blocks the last one is written. With PATH arguments, only
those files are written. Prints each file written. Copies bytes exactly, so
typographic quotes and dashes survive.
"""
import os, re, sys

brief, only = sys.argv[1], set(sys.argv[2:])
text = open(brief, encoding='utf-8').read()
path_re = re.compile(r'`((?:src|scripts)/[^`\s]+\.(?:ts|svelte|js|mjs))`')
blocks, last_path, pos = {}, None, 0
for m in re.finditer(r"^```([a-z]*)\n(.*?)^```[ \t]*$", text, re.S | re.M):
    for p in path_re.finditer(text, pos, m.start()):
        last_path = p.group(1)
    pos = m.end()
    if last_path and m.group(1) in ('', 'ts', 'typescript', 'svelte', 'js', 'javascript'):
        blocks[last_path] = m.group(2)

for path, body in blocks.items():
    if only and path not in only:
        continue
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(body)
    print('wrote', path)
