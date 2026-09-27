import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Read from disk: Vitest's CSS handling turns `?raw` imports of CSS into an empty string.
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');

describe('app.css', () => {
	it('sets 16px body text with a 1.5 line height', () => {
		expect(css).toMatch(/font:\s*16px\/1\.5/);
	});

	it('uses the direction document’s type scale', () => {
		expect(css).toContain('--text-lg: 1.25rem;');
		expect(css).toContain('--text-xl: 1.5625rem;');
		expect(css).toContain('--text-2xl: 1.9375rem;');
	});

	it('has no rules left from the static site', () => {
		for (const selector of ['#app', '#sidebar', '#main', '#map', '.legend', 'label.field']) {
			expect(css).not.toContain(selector);
		}
	});
});
