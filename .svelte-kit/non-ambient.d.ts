
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
		RouteId(): "/" | "/alex" | "/map" | "/paddocks" | "/timesheet" | "/weather" | "/weather/[metric]";
		RouteParams(): {
			"/weather/[metric]": { metric: string }
		};
		LayoutParams(): {
			"/": { metric?: string };
			"/alex": Record<string, never>;
			"/map": Record<string, never>;
			"/paddocks": Record<string, never>;
			"/timesheet": Record<string, never>;
			"/weather": { metric?: string };
			"/weather/[metric]": { metric: string }
		};
		Pathname(): "/" | "/alex" | "/alex/" | "/map" | "/map/" | "/paddocks" | "/paddocks/" | "/timesheet" | "/timesheet/" | "/weather" | "/weather/" | `/weather/${string}` & {} | `/weather/${string}/` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/img/logo.png" | "/img/tom-and-alex.jpg" | "/robots.txt" | "/video/pysn.mp4" | string & {};
	}
}