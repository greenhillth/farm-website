import type { ParsedCsv } from './csv';
import { CSV_REQUIRED_HEADERS, metricColumns, optionalColumns } from './schema';

export type Issue = { row: number | null; column: string | null; message: string };
export type CsvCheck = {
	rowCount: number;
	preview: ParsedCsv;
	errors: Issue[];
	warnings: Issue[];
	duplicateSampleIds: string[];
};
export type CheckContext = {
	knownPaddockIds: ReadonlySet<number>;
	existingSamples: ReadonlySet<string>;
};

// These rules mirror gbros-api's normalise_csv_row, which rejects the whole import on a bad row.
const METRIC_HEADERS = new Set<string>([
	...metricColumns.map((column) => column.key),
	...optionalColumns.map((column) => column.key),
	'pH'
]);
const KNOWN_HEADERS = new Set<string>([
	...CSV_REQUIRED_HEADERS,
	'client',
	'grower',
	'crop',
	...METRIC_HEADERS
]);
const WHOLE_NUMBER = /^[+-]?\d+$/;
const NUMBER_PREFIX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;
const EMPTY_METRIC = new Set(['', 'na', 'n/a', 'null']);
const ISO_DATE =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** The pair the backend treats as the same soil test. */
export function sampleKey(fieldId: number | string, sampleId: number | string): string {
	return `${Number(fieldId)}:${Number(sampleId)}`;
}

/** All digits (an Excel date number) or an ISO date, optionally with a time. */
export function isImportableDate(text: string): boolean {
	const value = text.trim();
	if (/^\d+$/.test(value)) return true;
	const match = ISO_DATE.exec(value);
	if (!match) return false;
	const [year, month, day] = match.slice(1, 4).map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

export function validateCsv(parsed: ParsedCsv, context: CheckContext): CsvCheck {
	const { headers, rows } = parsed;
	const errors: Issue[] = [];
	const warnings: Issue[] = [];
	const duplicates = new Set<string>();
	const result = () => ({
		rowCount: rows.length,
		preview: { headers, rows: rows.slice(0, 5) },
		errors,
		warnings,
		duplicateSampleIds: [...duplicates]
	});

	const missing = CSV_REQUIRED_HEADERS.filter((name) => !headers.includes(name));
	for (const name of missing) {
		errors.push({ row: null, column: name, message: `The file has no "${name}" column.` });
	}
	if (missing.length > 0) return result();
	if (rows.length === 0) {
		errors.push({ row: null, column: null, message: 'The file has no data rows.' });
		return result();
	}

	const unknown = headers.filter((name) => name !== '' && !KNOWN_HEADERS.has(name));
	if (unknown.length > 0) {
		warnings.push({
			row: null,
			column: null,
			message: `These columns will be ignored: ${unknown.join(', ')}.`
		});
	}

	const column = (name: string) => headers.indexOf(name);
	const metricIndexes = headers
		.map((name, index) => ({ name, index }))
		.filter(({ name }) => METRIC_HEADERS.has(name));
	const firstRowOf = new Map<string, number>();

	rows.forEach((cells, index) => {
		const row = index + 2;
		const cell = (name: string) => (cells[column(name)] ?? '').trim();
		const fail = (name: string, message: string) =>
			errors.push({ row, column: name, message: `Row ${row}: ${message}` });

		const fieldText = cell('fieldID');
		const sampleText = cell('id_sample');
		const fieldOk = WHOLE_NUMBER.test(fieldText);
		const sampleOk = WHOLE_NUMBER.test(sampleText);

		if (!fieldOk) {
			fail(
				'fieldID',
				fieldText ? `fieldID "${fieldText}" isn't a whole number.` : 'fieldID is empty.'
			);
		} else if (
			context.knownPaddockIds.size > 0 &&
			!context.knownPaddockIds.has(Number(fieldText))
		) {
			fail('fieldID', `paddock ${Number(fieldText)} isn't on the farm map.`);
		}
		if (!sampleOk) {
			fail(
				'id_sample',
				sampleText ? `id_sample "${sampleText}" isn't a whole number.` : 'id_sample is empty.'
			);
		}
		if (cell('name_sample') === '') fail('name_sample', 'name_sample is empty.');

		const date = cell('sample_date');
		if (!isImportableDate(date)) {
			fail(
				'sample_date',
				date ? `sample_date "${date}" isn't a date. Use YYYY-MM-DD.` : 'sample_date is empty.'
			);
		}

		let hasResult = false;
		for (const { name, index: cellIndex } of metricIndexes) {
			const raw = (cells[cellIndex] ?? '').trim();
			if (EMPTY_METRIC.has(raw.toLowerCase())) continue;
			if (NUMBER_PREFIX.test(raw.replaceAll(',', ''))) hasResult = true;
			else fail(name, `${name} "${raw}" isn't a number.`);
		}
		if (!hasResult) {
			warnings.push({
				row,
				column: null,
				message: `Row ${row} has no test results and will be skipped.`
			});
		}

		if (fieldOk && sampleOk) {
			const key = sampleKey(fieldText, sampleText);
			const earlier = firstRowOf.get(key);
			if (earlier !== undefined) {
				fail(
					'id_sample',
					`sample ${Number(sampleText)} for paddock ${Number(fieldText)} is already on row ${earlier}.`
				);
			} else {
				firstRowOf.set(key, row);
				if (context.existingSamples.has(key)) duplicates.add(String(Number(sampleText)));
			}
		}
	});

	return result();
}
