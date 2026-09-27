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
