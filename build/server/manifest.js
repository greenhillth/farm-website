const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["img/aerial-map.jpg","img/background.webp","img/confused-dad-1.jpg","img/logo-square.svg","img/logo.png","img/manual-card.webp","img/map-card.webp","img/paddock-4.jpg","img/paddock-card.webp","img/sharepoint.jpg","img/sharepoint.svg","img/soil-card.webp","img/soil.jpg","img/tom-and-alex.jpg","img/tractor-1.jpg","img/weather-station.webp","robots.txt","video/pysn.mp4"]),
	mimeTypes: {".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png",".txt":"text/plain",".mp4":"video/mp4"},
	_: {
		client: {start:"_app/immutable/entry/start.2gsauZiZ.js",app:"_app/immutable/entry/app.BHb8aXZY.js",imports:["_app/immutable/entry/start.2gsauZiZ.js","_app/immutable/chunks/w9uLdyuF.js","_app/immutable/chunks/BKAmdj7v.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/BAepqZDa.js","_app/immutable/chunks/CSpGEONf.js","_app/immutable/entry/app.BHb8aXZY.js","_app/immutable/chunks/D3hnq5Lw.js","_app/immutable/chunks/CyMfPZwD.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BKAmdj7v.js","_app/immutable/chunks/BAepqZDa.js","_app/immutable/chunks/C8G_k6Vd.js","_app/immutable/chunks/BWB5JzbP.js","_app/immutable/chunks/CAllNap8.js","_app/immutable/chunks/Cvi7aHJ-.js","_app/immutable/chunks/CSpGEONf.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-B2_zVCmf.js')),
			__memo(() => import('./chunks/1-DDvp8SDn.js')),
			__memo(() => import('./chunks/2-BKzt1weL.js')),
			__memo(() => import('./chunks/3-CMmRqGdK.js')),
			__memo(() => import('./chunks/4-DjMeLkYX.js')),
			__memo(() => import('./chunks/5-CW5YZ2lx.js')),
			__memo(() => import('./chunks/6-Dja2EDzO.js')),
			__memo(() => import('./chunks/7-C3djn9YO.js')),
			__memo(() => import('./chunks/8-DPPCsGPU.js')),
			__memo(() => import('./chunks/9-DI20A8Gb.js')),
			__memo(() => import('./chunks/10-BppPk5xR.js'))
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
