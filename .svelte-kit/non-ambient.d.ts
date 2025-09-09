
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
		RouteId(): "/" | "/alex" | "/map" | "/weather";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/alex": Record<string, never>;
			"/map": Record<string, never>;
			"/weather": Record<string, never>
		};
		Pathname(): "/" | "/alex" | "/alex/" | "/map" | "/map/" | "/weather" | "/weather/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/img/logo.png" | "/img/tom-and-alex.jpg" | "/robots.txt" | "/video/pysn.mp4" | string & {};
	}
}