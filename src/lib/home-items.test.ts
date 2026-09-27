import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { homeItems } from './home-items';

const staticDir = fileURLToPath(new URL('../../static', import.meta.url));
const MAX_CARD_IMAGE_BYTES = 150_000;

const localImages = homeItems
	.map((item) => item.image)
	.filter((image): image is string => typeof image === 'string' && !/^https?:/.test(image));

describe('homeItems', () => {
	it.each(localImages)('%s is an absolute path to a file in static/', (image) => {
		expect(image.startsWith('/')).toBe(true);
		expect(existsSync(`${staticDir}${image}`)).toBe(true);
	});

	it.each(localImages)('%s is a thumbnail under 150 KB', (image) => {
		expect(statSync(`${staticDir}/${image.replace(/^\//, '')}`).size).toBeLessThan(
			MAX_CARD_IMAGE_BYTES
		);
	});

	it('has unique titles, which the home page uses as keys', () => {
		const titles = homeItems.map((item) => item.title);
		expect(new Set(titles).size).toBe(titles.length);
	});
});
