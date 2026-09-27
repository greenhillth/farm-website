### Task 1: CSV parser

**Files:**

- Create: `src/lib/soil-tests/csv.ts`
- Create: `src/lib/soil-tests/csv.test.ts`

**Interfaces:**

- Produces: `type ParsedCsv = { headers: string[]; rows: string[][] }` and `parseCsv(text: string): ParsedCsv`. Headers are trimmed. Blank lines are dropped (the backend's `csv.DictReader` skips them too, so row numbers match its messages). Rows keep their own length (ragged rows aren't padded).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/soil-tests/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';

describe('parseCsv', () => {
	it('reads headers and rows', () => {
		expect(parseCsv('a,b\n1,2\n3,4')).toEqual({
			headers: ['a', 'b'],
			rows: [
				['1', '2'],
				['3', '4']
			]
		});
	});

	it('keeps commas, escaped quotes and newlines inside quoted fields', () => {
		expect(parseCsv('name,note\n"Smith, J","said ""hi""\nthen left"').rows).toEqual([
			['Smith, J', 'said "hi"\nthen left']
		]);
	});

	it('handles CRLF line endings and a UTF-8 BOM', () => {
		expect(parseCsv('﻿fieldID,id_sample\r\n42,1001\r\n')).toEqual({
			headers: ['fieldID', 'id_sample'],
			rows: [['42', '1001']]
		});
	});

	it('ignores a trailing newline and blank lines', () => {
		expect(parseCsv('a\n1\n\n2\n\n').rows).toEqual([['1'], ['2']]);
	});

	it('keeps ragged rows as they are', () => {
		expect(parseCsv('a,b,c\n1\n1,2,3,4').rows).toEqual([['1'], ['1', '2', '3', '4']]);
	});

	it('trims headers but not cells', () => {
		expect(parseCsv(' a , b \n 1 ,2')).toEqual({ headers: ['a', 'b'], rows: [[' 1 ', '2']] });
	});

	it('returns nothing for empty text', () => {
		expect(parseCsv('')).toEqual({ headers: [], rows: [] });
	});
});
```

Run: `npx vitest run --project server src/lib/soil-tests/csv.test.ts`
Expected: FAIL, "Failed to resolve import './csv'".

- [ ] **Step 2: Create `src/lib/soil-tests/csv.ts`**

```ts
export type ParsedCsv = { headers: string[]; rows: string[][] };

/**
 * RFC 4180-style parsing: quoted fields (with commas, newlines and "" escapes), CRLF or LF line
 * endings, and an optional UTF-8 BOM. Blank lines are dropped, as the backend's csv reader does.
 */
export function parseCsv(text: string): ParsedCsv {
	const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let quoted = false;

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];
		if (quoted) {
			if (char === '"' && input[i + 1] === '"') {
				field += '"';
				i += 1;
			} else if (char === '"') {
				quoted = false;
			} else {
				field += char;
			}
		} else if (char === '"' && field === '') {
			quoted = true;
		} else if (char === ',') {
			record.push(field);
			field = '';
		} else if (char === '\r' || char === '\n') {
			record.push(field);
			records.push(record);
			record = [];
			field = '';
			if (char === '\r' && input[i + 1] === '\n') i += 1;
		} else {
			field += char;
		}
	}
	if (field !== '' || record.length > 0) {
		record.push(field);
		records.push(record);
	}

	const lines = records.filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));
	const [headerRow = [], ...rows] = lines;
	return { headers: headerRow.map((header) => header.trim()), rows };
}
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run --project server src/lib/soil-tests/csv.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/soil-tests/csv.ts src/lib/soil-tests/csv.test.ts
git commit -m "Add a CSV parser for checking soil test files in the browser"
```

---

