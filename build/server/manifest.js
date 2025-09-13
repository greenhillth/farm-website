const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["img/logo.png","img/tom-and-alex.jpg","robots.txt","video/pysn.mp4"]),
	mimeTypes: {".png":"image/png",".jpg":"image/jpeg",".txt":"text/plain",".mp4":"video/mp4"},
	_: {
		client: {start:"_app/immutable/entry/start.5R2RzmQD.js",app:"_app/immutable/entry/app.cB-dAKS7.js",imports:["_app/immutable/entry/start.5R2RzmQD.js","_app/immutable/chunks/C_XJ_A0c.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/entry/app.cB-dAKS7.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/chunks/DAHDt1MN.js","_app/immutable/chunks/CBkiyM78.js","_app/immutable/chunks/CuUo-GuR.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-Dy_XalPy.js')),
			__memo(() => import('./chunks/1-BkeSzo3M.js')),
			__memo(() => import('./chunks/2-Du3vFmrd.js')),
			__memo(() => import('./chunks/3-D8m98R9o.js')),
			__memo(() => import('./chunks/4-ChaalPHq.js')),
			__memo(() => import('./chunks/5-BsQDZyZw.js')),
			__memo(() => import('./chunks/6-DjruAUFu.js')),
			__memo(() => import('./chunks/7-BaFY9v7U.js')),
			__memo(() => import('./chunks/8-K0K-WXHt.js'))
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
				id: "/map",
				pattern: /^\/map\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/paddocks",
				pattern: /^\/paddocks\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/timesheet",
				pattern: /^\/timesheet\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/weather",
				pattern: /^\/weather\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/weather/[metric]",
				pattern: /^\/weather\/([^/]+?)\/?$/,
				params: [{"name":"metric","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
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
