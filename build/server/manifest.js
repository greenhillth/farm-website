const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["img/aerial-map.jpg","img/background.webp","img/confused-dad-1.jpg","img/logo.png","img/manual-card.webp","img/map-card.webp","img/paddock-4.jpg","img/paddock-card.webp","img/sharepoint.jpg","img/sharepoint.svg","img/soil-card.webp","img/soil.jpg","img/tom-and-alex.jpg","img/tractor-1.jpg","img/weather-station.webp","robots.txt","video/pysn.mp4"]),
	mimeTypes: {".jpg":"image/jpeg",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".txt":"text/plain",".mp4":"video/mp4"},
	_: {
		client: {start:"_app/immutable/entry/start.CjcNHvg5.js",app:"_app/immutable/entry/app.-NhfEktp.js",imports:["_app/immutable/entry/start.CjcNHvg5.js","_app/immutable/chunks/cIj8C3f_.js","_app/immutable/chunks/SMSclcs1.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/BkQ9GEEK.js","_app/immutable/entry/app.-NhfEktp.js","_app/immutable/chunks/CthTPqsi.js","_app/immutable/chunks/CNYzTQXq.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/SMSclcs1.js","_app/immutable/chunks/BkQ9GEEK.js","_app/immutable/chunks/DLeCJMEp.js","_app/immutable/chunks/Y1ZwfwKz.js","_app/immutable/chunks/BbaiMmwp.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BxH0V8Hg.js')),
			__memo(() => import('./chunks/1-DENWQCAn.js')),
			__memo(() => import('./chunks/2-BCWQggnW.js')),
			__memo(() => import('./chunks/3-C0l-xv-a.js')),
			__memo(() => import('./chunks/4-CTxdKOJi.js')),
			__memo(() => import('./chunks/5-H45GPgty.js')),
			__memo(() => import('./chunks/6-i8Qvv9LA.js')),
			__memo(() => import('./chunks/7-WCo7DKy9.js')),
			__memo(() => import('./chunks/8-CV77kU8w.js')),
			__memo(() => import('./chunks/9-BhPAslMB.js')),
			__memo(() => import('./chunks/10-xm7xxWgL.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/alex",
				pattern: /^\/alex\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/[...path]",
				pattern: /^\/api(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-7Lu9Ek4W.js'))
			},
			{
				id: "/manual",
				pattern: /^\/manual\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/map",
				pattern: /^\/map\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/paddocks",
				pattern: /^\/paddocks\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/soiltests",
				pattern: /^\/soiltests\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/timesheet",
				pattern: /^\/timesheet\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/weather",
				pattern: /^\/weather\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/weather/[metric]",
				pattern: /^\/weather\/([^/]+?)\/?$/,
				params: [{"name":"metric","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
