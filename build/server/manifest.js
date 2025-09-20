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
		client: {start:"_app/immutable/entry/start.Y8oTfNOn.js",app:"_app/immutable/entry/app.BwWt6AzM.js",imports:["_app/immutable/entry/start.Y8oTfNOn.js","_app/immutable/chunks/CBkjmUdE.js","_app/immutable/chunks/DGtjQllA.js","_app/immutable/chunks/DsSUZBsh.js","_app/immutable/chunks/9EmW-GsR.js","_app/immutable/chunks/CX9GW7SH.js","_app/immutable/chunks/5IiInUXS.js","_app/immutable/entry/app.BwWt6AzM.js","_app/immutable/chunks/DsSUZBsh.js","_app/immutable/chunks/9EmW-GsR.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DGtjQllA.js","_app/immutable/chunks/CX9GW7SH.js","_app/immutable/chunks/D-WHDOiA.js","_app/immutable/chunks/B4zGmnkn.js","_app/immutable/chunks/B6_lBng7.js","_app/immutable/chunks/DDlElFAC.js","_app/immutable/chunks/5IiInUXS.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BxquB-fi.js')),
			__memo(() => import('./chunks/1-VnEfvC6s.js')),
			__memo(() => import('./chunks/2-Bl2VDA1L.js')),
			__memo(() => import('./chunks/3-Bzt1lQ95.js')),
			__memo(() => import('./chunks/4-DrlPI5gI.js')),
			__memo(() => import('./chunks/5-BOkqd9OK.js')),
			__memo(() => import('./chunks/6-DmJ-eXrv.js')),
			__memo(() => import('./chunks/7-DbJnKy5L.js')),
			__memo(() => import('./chunks/8-BDuZeT7x.js')),
			__memo(() => import('./chunks/9-zo1zYjw3.js')),
			__memo(() => import('./chunks/10-DT7LkN2m.js'))
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
