import { describe, expect, it } from 'vitest';

import { parseCsv } from './csv';
import { isImportableDate, sampleKey, validateCsv } from './validate';

const header = 'id_sample,fieldID,sample_date,name_sample,P,ph_water';
const context = { knownPaddockIds: new Set([42, 7]), existingSamples: new Set<string>() };
const check = (text: string, ctx = context) => validateCsv(parseCsv(text), ctx);
const messages = (issues: { message: string }[]) => issues.map((issue) => issue.message);

describe('isImportableDate', () => {
	it.each(['2024-05-01', '2024-05-01T09:30:00', '2024-05-01 09:30', '45888'])(
		'accepts %s',
		(value) => {
			expect(isImportableDate(value)).toBe(true);
		}
	);

	it.each(['', '01/05/2024', '2024-02-30', '2024-13-01', 'May 2024'])('rejects "%s"', (value) => {
		expect(isImportableDate(value)).toBe(false);
	});
});

describe('validateCsv', () => {
	it('passes a clean file and previews the first five rows', () => {
		const rows = Array.from({ length: 7 }, (_, i) => `${1000 + i},42,2024-05-01,S${i},50,6.1`);
		const result = check([header, ...rows].join('\n'));

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.rowCount).toBe(7);
		expect(result.preview.rows).toHaveLength(5);
		expect(result.preview.headers).toEqual(header.split(','));
	});

	it('accepts the lab sample file, which uses Excel date numbers', () => {
		const lab =
			'id_sample,fieldID,sample_date,client,grower,crop,name_sample,P,olsen_P,K\n' +
			'250814116,42,45888,E E MUIR,GREENHILL BROS,SOIL (Potato),ES22,82.64,,398.88';
		expect(check(lab).errors).toEqual([]);
	});

	it('names each missing required header and stops there', () => {
		const result = check('fieldID,P\n42,50');
		expect(messages(result.errors)).toEqual([
			'The file has no “id_sample” column.',
			'The file has no “name_sample” column.',
			'The file has no “sample_date” column.'
		]);
	});

	it('blocks a file with no data rows', () => {
		expect(messages(check(header).errors)).toEqual(['The file has no data rows.']);
	});

	it('reports bad cells by row number, counting the header as row 1', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,50,6.1',
				'x1,4.5,01/05/2024,,50,6.1',
				'1003,999,2024-05-01,C,abc,6.1'
			].join('\n')
		);

		expect(result.errors).toEqual([
			{ row: 3, column: 'fieldID', message: 'Row 3: fieldID “4.5” isn’t a whole number.' },
			{ row: 3, column: 'id_sample', message: 'Row 3: id_sample “x1” isn’t a whole number.' },
			{ row: 3, column: 'name_sample', message: 'Row 3: name_sample is empty.' },
			{
				row: 3,
				column: 'sample_date',
				message: 'Row 3: sample_date “01/05/2024” isn’t a date. Use YYYY-MM-DD.'
			},
			{ row: 4, column: 'fieldID', message: 'Row 4: paddock 999 isn’t on the farm map.' },
			{ row: 4, column: 'P', message: 'Row 4: P “abc” isn’t a number.' }
		]);
	});

	it('treats blank, NA, n/a, null and thousands separators as the backend does', () => {
		const result = check(
			[header, '1001,42,2024-05-01,A,,NA', '1002,42,2024-05-01,B,1,234,n/a'].join('\n')
		);
		// Row 3 is ragged after the comma in "1,234"; only real errors count.
		expect(messages(result.errors)).toEqual([]);
		expect(check([header, '1002,42,2024-05-01,B,"1,234",null'].join('\n')).errors).toEqual([]);
	});

	it('warns about a row without any results, which the backend skips', () => {
		const result = check([header, '1001,42,2024-05-01,A,,'].join('\n'));
		expect(result.errors).toEqual([]);
		expect(messages(result.warnings)).toEqual(['Row 2 has no test results and will be skipped.']);
	});

	it('warns once about columns the backend ignores', () => {
		const result = check(
			[
				'id_sample,fieldID,sample_date,name_sample,P,colour,notes',
				'1001,42,2024-05-01,A,5,red,x'
			].join('\n')
		);
		expect(messages(result.warnings)).toEqual(['These columns will be ignored: colour, notes.']);
	});

	it('blocks the same sample twice in one file', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,5,6',
				'1001,42,2024-06-01,B,5,6',
				'1001,7,2024-05-01,C,5,6'
			].join('\n')
		);
		expect(messages(result.errors)).toEqual([
			'Row 3: sample 1001 for paddock 42 is already on row 2.'
		]);
	});

	it('lists samples that are already in the system, matched on paddock and sample', () => {
		const result = check(
			[
				header,
				'1001,42,2024-05-01,A,5,6',
				'1002,42,2024-05-01,B,5,6',
				'1001,7,2024-05-01,C,5,6'
			].join('\n'),
			{ ...context, existingSamples: new Set([sampleKey(42, 1001), sampleKey(42, 1002)]) }
		);
		expect(result.errors).toEqual([]);
		expect(result.duplicateSampleIds).toEqual(['1001', '1002']);
	});

	it('skips the paddock check when the paddock list is unavailable', () => {
		const result = check([header, '1001,999,2024-05-01,A,5,6'].join('\n'), {
			knownPaddockIds: new Set(),
			existingSamples: new Set()
		});
		expect(result.errors).toEqual([]);
	});
});
