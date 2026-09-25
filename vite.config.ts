import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		include: ['leaflet']
	},
	ssr: {
		noExternal: ['leaflet']
	},
	server: {
		host: true,
		port: 4001,
		strictPort: true,
		allowedHosts: ['farm.greenhill.net.au'],
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true
			}
		}
	},
	preview: {
		host: true,
		port: 4002,
		strictPort: true
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: 'v8',
			include: ['src/**/*.{ts,svelte}'],
			exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
			reporter: ['text-summary', 'html', 'lcov']
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					// Dates are parsed in the farm's time zone, so pin it (CI runners use UTC).
					env: { TZ: 'Australia/Melbourne' },
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts']
				}
			}
		]
	}
});
