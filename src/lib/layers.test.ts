import { describe, expect, it } from 'vitest';

import { buildBaseTooltipHtml, buildTitleTooltipHtml, type TitleFeatureProperties } from './layers';

const title = (overrides: Partial<TitleFeatureProperties>): TitleFeatureProperties => ({
	objectID: 1,
	pid: 123,
	potPid: 0,
	volume: '1',
	folio: 2,
	titleRef: '1/2',
	address: '1 Farm Rd',
	ownershipPct: '100%',
	owners: ['Stuart', 'Greenhill'],
	...overrides
});

describe('buildTitleTooltipHtml', () => {
	it('escapes backend text', () => {
		const html = buildTitleTooltipHtml(
			title({ address: '<img src=x onerror=alert(1)>', owners: ['Tom', 'Smith & Co'] })
		);
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).toContain('Smith &amp; Co');
		expect(html).not.toContain('<img');
	});

	it('falls back when the address is missing', () => {
		expect(buildTitleTooltipHtml(title({ address: '' }))).toContain('Untitled property');
	});
});

describe('buildBaseTooltipHtml', () => {
	it('escapes the paddock name and id', () => {
		expect(buildBaseTooltipHtml('<b>North</b>', 7)).toBe(
			'<div><strong>&lt;b&gt;North&lt;/b&gt;</strong></div><div>ID: 7</div>'
		);
	});
});
