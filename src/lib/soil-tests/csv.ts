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
