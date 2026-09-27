import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import LocateButton from './LocateButton.svelte';

function stubGeolocation(
	respond: (success: PositionCallback, failure: PositionErrorCallback) => void
) {
	return {
		// Browsers always call back asynchronously, after watchPosition has returned its id.
		watchPosition: vi.fn((success: PositionCallback, failure: PositionErrorCallback) => {
			setTimeout(() => respond(success, failure), 0);
			return 7;
		}),
		clearWatch: vi.fn(),
		getCurrentPosition: vi.fn()
	} as unknown as Geolocation & { clearWatch: ReturnType<typeof vi.fn> };
}

const fix = { coords: { latitude: -41.2, longitude: 146.4, accuracy: 12 } } as GeolocationPosition;
const failure = (code: number) => ({ code, PERMISSION_DENIED: 1 }) as GeolocationPositionError;
const handlers = () => ({ onposition: vi.fn(), onerror: vi.fn(), onstop: vi.fn() });

describe('LocateButton.svelte', () => {
	it('reports positions while on, and stops watching when turned off', async () => {
		const geolocation = stubGeolocation((success) => success(fix));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() =>
			expect(on.onposition).toHaveBeenCalledWith({ lat: -41.2, lon: 146.4, accuracy: 12 })
		);

		const stop = page.getByRole('button', { name: 'Stop showing my location' });
		await expect.element(stop).toHaveAttribute('aria-pressed', 'true');
		await stop.click();
		expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
		expect(on.onstop).toHaveBeenCalledOnce();
	});

	it('explains a denied permission and turns itself off', async () => {
		const geolocation = stubGeolocation((_, fail) => fail(failure(1)));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() =>
			expect(on.onerror).toHaveBeenCalledWith('Location is turned off for this site.')
		);
		await expect
			.element(page.getByRole('button', { name: 'Show my location' }))
			.toHaveAttribute('aria-pressed', 'false');
	});

	it('explains an unavailable position or a timeout', async () => {
		const geolocation = stubGeolocation((_, fail) => fail(failure(3)));
		const on = handlers();
		render(LocateButton, { ...on, geolocation, secure: true });

		await page.getByRole('button', { name: 'Show my location' }).click();
		await vi.waitFor(() => expect(on.onerror).toHaveBeenCalledWith("Couldn't find your location."));
	});

	it('is hidden on an insecure connection', async () => {
		const geolocation = stubGeolocation(() => {});
		render(LocateButton, { ...handlers(), geolocation, secure: false });

		await expect
			.element(page.getByRole('button', { name: 'Show my location' }))
			.not.toBeInTheDocument();
	});
});
