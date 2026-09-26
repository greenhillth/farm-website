import { describe, expect, it } from 'vitest';

import { escapeHtml } from './html';

describe('escapeHtml', () => {
	it('escapes the characters that matter in HTML text and attributes', () => {
		expect(escapeHtml(`<b class="x">Tom & Alex's</b>`)).toBe(
			'&lt;b class=&quot;x&quot;&gt;Tom &amp; Alex&#39;s&lt;/b&gt;'
		);
	});

	it('renders null and undefined as empty text and numbers as text', () => {
		expect(escapeHtml(null)).toBe('');
		expect(escapeHtml(undefined)).toBe('');
		expect(escapeHtml(42)).toBe('42');
	});
});
