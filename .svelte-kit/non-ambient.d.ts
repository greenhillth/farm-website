
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/alex" | "/api" | "/api/[...path]" | "/manual" | "/map" | "/paddocks" | "/soiltests" | "/timesheet" | "/weather" | "/weather/[metric]";
		RouteParams(): {
			"/api/[...path]": { path: string };
			"/weather/[metric]": { metric: string }
		};
		LayoutParams(): {
			"/": { path?: string; metric?: string };
			"/alex": Record<string, never>;
			"/api": { path?: string };
			"/api/[...path]": { path: string };
			"/manual": Record<string, never>;
			"/map": Record<string, never>;
			"/paddocks": Record<string, never>;
			"/soiltests": Record<string, never>;
			"/timesheet": Record<string, never>;
			"/weather": { metric?: string };
			"/weather/[metric]": { metric: string }
		};
		Pathname(): "/" | "/alex" | `/api/${string}` & {} | "/manual" | "/map" | "/paddocks" | "/soiltests" | "/timesheet" | "/weather" | `/weather/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/img/aerial-map.jpg" | "/img/background.webp" | "/img/confused-dad-1.jpg" | "/img/gbros-rounded.svg" | "/img/gbros.svg" | "/img/gbros.webp" | "/img/logo-square.svg" | "/img/logo.png" | "/img/manual-card.webp" | "/img/map-card.webp" | "/img/paddock-4.jpg" | "/img/paddock-card.webp" | "/img/sharepoint.jpg" | "/img/sharepoint.svg" | "/img/soil-card.webp" | "/img/soil.jpg" | "/img/tom-and-alex.jpg" | "/img/tractor-1.jpg" | "/img/weather-station.webp" | "/robots.txt" | "/samples/soil-tests.csv" | "/video/pysn.mp4" | string & {};
	}
}