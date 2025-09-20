const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["img/aerial-map.jpg","img/background.webp","img/confused-dad-1.jpg","img/gbros-rounded.svg","img/gbros.svg","img/gbros.webp","img/logo-square.svg","img/logo.png","img/manual-card.webp","img/map-card.webp","img/paddock-4.jpg","img/paddock-card.webp","img/sharepoint.jpg","img/sharepoint.svg","img/soil-card.webp","img/soil.jpg","img/tom-and-alex.jpg","img/tractor-1.jpg","img/weather-station.webp","robots.txt","video/pysn.mp4"]),
	mimeTypes: {".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".png":"image/png",".txt":"text/plain",".mp4":"video/mp4"},
	_: {
		client: {start:"_app/immutable/entry/start.PLWDgZg_.js",app:"_app/immutable/entry/app.fxZ7uZ0x.js",imports:["_app/immutable/entry/start.PLWDgZg_.js","_app/immutable/chunks/VuTTStca.js","_app/immutable/chunks/BQITOQ2H.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/BPPT-HsW.js","_app/immutable/chunks/CsBJ9ToZ.js","_app/immutable/entry/app.fxZ7uZ0x.js","_app/immutable/chunks/DQ7jUk8X.js","_app/immutable/chunks/BpVGysJh.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BQITOQ2H.js","_app/immutable/chunks/BPPT-HsW.js","_app/immutable/chunks/CM66DKVZ.js","_app/immutable/chunks/DbgaR2Qa.js","_app/immutable/chunks/CSrG6tpm.js","_app/immutable/chunks/C9W0NbdG.js","_app/immutable/chunks/CsBJ9ToZ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CGtHhBE6.js')),
			__memo(() => import('./chunks/1-9sg91KYD.js')),
			__memo(() => import('./chunks/2-DGT6dCVW.js')),
			__memo(() => import('./chunks/3-Vft7cZPM.js')),
			__memo(() => import('./chunks/4-DI3erMVV.js')),
			__memo(() => import('./chunks/5-BzkpqQr6.js')),
			__memo(() => import('./chunks/6-CF1QjSjY.js')),
			__memo(() => import('./chunks/7-CCCxZJNe.js')),
			__memo(() => import('./chunks/8-DDZhLGJU.js')),
			__memo(() => import('./chunks/9-MfN55KkL.js')),
			__memo(() => import('./chunks/10-CS9kg4EG.js'))
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
