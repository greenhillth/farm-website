#!/usr/bin/env node
// Screenshots pages of a running dev server at phone and desktop widths, for design review.
// Usage: node scripts/screenshot.mjs <out-dir> <path>... (BASE_URL defaults to http://localhost:4001)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [outDir, ...paths] = process.argv.slice(2);
if (!outDir || paths.length === 0) {
	console.error('Usage: node scripts/screenshot.mjs <out-dir> <path>...');
	process.exit(1);
}
const base = process.env.BASE_URL ?? 'http://localhost:4001';
const viewports = [
	{ width: 390, height: 844, isMobile: true, hasTouch: true },
	{ width: 1280, height: 800, isMobile: false, hasTouch: false }
];

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
for (const { width, height, isMobile, hasTouch } of viewports) {
	const page = await browser.newPage({ viewport: { width, height }, isMobile, hasTouch });
	for (const path of paths) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		// Lazy images and map tiles need a moment after network idle.
		await page.waitForTimeout(1000);
		const name = path === '/' ? 'home' : path.replace(/^\//, '').replace(/[/?=&]/g, '_');
		await page.screenshot({
			path: `${outDir}/${name}-${width}.png`,
			fullPage: !path.startsWith('/map')
		});
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth
		);
		console.log(`${name}-${width}${overflow ? '  HORIZONTAL SCROLL' : ''}`);
	}
	await page.close();
}
await browser.close();
