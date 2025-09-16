
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
		RouteId(): "/" | "/alex" | "/manual" | "/map" | "/paddocks" | "/soiltests" | "/timesheet" | "/weather" | "/weather/[metric]";
		RouteParams(): {
			"/weather/[metric]": { metric: string }
		};
		LayoutParams(): {
			"/": { metric?: string };
			"/alex": Record<string, never>;
			"/manual": Record<string, never>;
			"/map": Record<string, never>;
			"/paddocks": Record<string, never>;
			"/soiltests": Record<string, never>;
			"/timesheet": Record<string, never>;
			"/weather": { metric?: string };
			"/weather/[metric]": { metric: string }
		};
		Pathname(): "/" | "/alex" | "/alex/" | "/manual" | "/manual/" | "/map" | "/map/" | "/paddocks" | "/paddocks/" | "/soiltests" | "/soiltests/" | "/timesheet" | "/timesheet/" | "/weather" | "/weather/" | `/weather/${string}` & {} | `/weather/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/img/aerial-map.jpg" | "/img/confused-dad-1.jpeg" | "/img/logo.png" | "/img/paddock-4.jpg" | "/img/soil.jpg" | "/img/tom-and-alex.jpg" | "/img/tractor-1.jpg" | "/img/weather-station.webp" | "/robots.txt" | "/video/pysn.mp4" | string & {};
	}
}