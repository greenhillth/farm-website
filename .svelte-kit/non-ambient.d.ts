
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
		RouteId(): "/" | "/alex" | "/api" | "/api/mqss" | "/api/mqss/weather" | "/api/mqss/weather/[metric]" | "/map" | "/paddocks" | "/timesheet" | "/weather" | "/weather/[metric]";
		RouteParams(): {
			"/api/mqss/weather/[metric]": { metric: string };
			"/weather/[metric]": { metric: string }
		};
		LayoutParams(): {
			"/": { metric?: string };
			"/alex": Record<string, never>;
			"/api": { metric?: string };
			"/api/mqss": { metric?: string };
			"/api/mqss/weather": { metric?: string };
			"/api/mqss/weather/[metric]": { metric: string };
			"/map": Record<string, never>;
			"/paddocks": Record<string, never>;
			"/timesheet": Record<string, never>;
			"/weather": { metric?: string };
			"/weather/[metric]": { metric: string }
		};
		Pathname(): "/" | "/alex" | "/alex/" | "/api" | "/api/" | "/api/mqss" | "/api/mqss/" | "/api/mqss/weather" | "/api/mqss/weather/" | `/api/mqss/weather/${string}` & {} | `/api/mqss/weather/${string}/` & {} | "/map" | "/map/" | "/paddocks" | "/paddocks/" | "/timesheet" | "/timesheet/" | "/weather" | "/weather/" | `/weather/${string}` & {} | `/weather/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/img/logo.png" | "/img/tom-and-alex.jpg" | "/robots.txt" | "/video/pysn.mp4" | string & {};
	}
}