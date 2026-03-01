const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["img/aerial-map.jpg","img/background.webp","img/confused-dad-1.jpg","img/gbros-rounded.svg","img/gbros.svg","img/gbros.webp","img/logo-square.svg","img/logo.png","img/manual-card.webp","img/map-card.webp","img/paddock-4.jpg","img/paddock-card.webp","img/sharepoint.jpg","img/sharepoint.svg","img/soil-card.webp","img/soil.jpg","img/tom-and-alex.jpg","img/tractor-1.jpg","img/weather-station.webp","robots.txt","samples/soil-tests.csv","video/pysn.mp4"]),
	mimeTypes: {".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png",".txt":"text/plain",".csv":"text/csv",".mp4":"video/mp4"},
	_: {
		client: {start:"_app/immutable/entry/start.CM6pYCY4.js",app:"_app/immutable/entry/app.CgS1qhgS.js",imports:["_app/immutable/entry/start.CM6pYCY4.js","_app/immutable/chunks/Dl_-jij7.js","_app/immutable/chunks/DyE--mCz.js","_app/immutable/chunks/DxtC1dWa.js","_app/immutable/chunks/DhDNuMY7.js","_app/immutable/entry/app.CgS1qhgS.js","_app/immutable/chunks/DyE--mCz.js","_app/immutable/chunks/BbdDiNu8.js","_app/immutable/chunks/gMANoNyM.js","_app/immutable/chunks/DhDNuMY7.js","_app/immutable/chunks/qtWtAah2.js","_app/immutable/chunks/CQRSbJO_.js","_app/immutable/chunks/BO9nOoVN.js","_app/immutable/chunks/BEAiq2bU.js","_app/immutable/chunks/BFYe4vL5.js","_app/immutable/chunks/DxtC1dWa.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-3QhSMGma.js')),
			__memo(() => import('./chunks/1-C2ntrki0.js')),
			__memo(() => import('./chunks/2-rZAxW5EP.js')),
			__memo(() => import('./chunks/3-CitpHrzf.js')),
			__memo(() => import('./chunks/4-D-UyXmbZ.js')),
			__memo(() => import('./chunks/5-Cc51AF9e.js')),
			__memo(() => import('./chunks/6-OudY8swX.js')),
			__memo(() => import('./chunks/7-B5Vt81cZ.js')),
			__memo(() => import('./chunks/8-Bqpwkwts.js')),
			__memo(() => import('./chunks/9-B-jOlwke.js')),
			__memo(() => import('./chunks/10-C0XnDaPv.js'))
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
