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
		client: {start:"_app/immutable/entry/start.Co2ouDfl.js",app:"_app/immutable/entry/app.D3gssIs7.js",imports:["_app/immutable/entry/start.Co2ouDfl.js","_app/immutable/chunks/CR2IhISL.js","_app/immutable/chunks/BN5QsEzf.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/BWS38yz9.js","_app/immutable/chunks/BzYxXZdQ.js","_app/immutable/entry/app.D3gssIs7.js","_app/immutable/chunks/Cy7NpJy3.js","_app/immutable/chunks/CuXKmgDK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BN5QsEzf.js","_app/immutable/chunks/BWS38yz9.js","_app/immutable/chunks/CpGDwUWb.js","_app/immutable/chunks/AJ7s5tBs.js","_app/immutable/chunks/BxrZu97y.js","_app/immutable/chunks/Bcbkfd4L.js","_app/immutable/chunks/BzYxXZdQ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-ktBvj0bm.js')),
			__memo(() => import('./chunks/1-B0DMW4v8.js')),
			__memo(() => import('./chunks/2-C_V30UHE.js')),
			__memo(() => import('./chunks/3-BydImSiZ.js')),
			__memo(() => import('./chunks/4-BYF3fw5n.js')),
			__memo(() => import('./chunks/5-C5t0pGbU.js')),
			__memo(() => import('./chunks/6-DLDQruDo.js')),
			__memo(() => import('./chunks/7-DduGL8of.js')),
			__memo(() => import('./chunks/8-DxnWYOjs.js')),
			__memo(() => import('./chunks/9-qo3a1glf.js')),
			__memo(() => import('./chunks/10-BeDjcEeF.js'))
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
