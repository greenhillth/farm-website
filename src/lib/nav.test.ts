import { describe, expect, it } from 'vitest';

import { externalLinks, isActive, primaryNav, secondaryNav } from './nav';

describe('isActive', () => {
	it('matches home only on /', () => {
		expect(isActive({ href: '/' }, '/')).toBe(true);
		expect(isActive({ href: '/' }, '/map')).toBe(false);
	});

	it('matches the section itself and pages below it', () => {
		expect(isActive({ href: '/weather' }, '/weather')).toBe(true);
		expect(isActive({ href: '/weather' }, '/weather/wind')).toBe(true);
	});

	it('does not match a path that only shares a prefix', () => {
		expect(isActive({ href: '/map' }, '/mapping')).toBe(false);
	});
});

describe('nav items', () => {
	it('puts the three main jobs in the primary nav after Home', () => {
		expect(primaryNav.map((item) => item.href)).toEqual(['/', '/map', '/weather', '/soiltests']);
	});

	it('has no timesheet entry anywhere', () => {
		const hrefs = [...primaryNav, ...secondaryNav, ...externalLinks].map((item) => item.href);
		expect(hrefs.some((href) => href.includes('timesheet'))).toBe(false);
	});

	it('only lists absolute https URLs as external links', () => {
		for (const link of externalLinks) expect(link.href).toMatch(/^https:\/\//);
	});
});
