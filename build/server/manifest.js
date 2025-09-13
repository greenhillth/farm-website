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
		client: {start:"_app/immutable/entry/start.xlTTIvgk.js",app:"_app/immutable/entry/app.Bm-Gt3Wh.js",imports:["_app/immutable/entry/start.xlTTIvgk.js","_app/immutable/chunks/CmWE_7oP.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/entry/app.Bm-Gt3Wh.js","_app/immutable/chunks/C0ys7KY4.js","_app/immutable/chunks/ClEjLSVY.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DN-rPOIK.js","_app/immutable/chunks/qZ6aaTlc.js","_app/immutable/chunks/DAHDt1MN.js","_app/immutable/chunks/CBkiyM78.js","_app/immutable/chunks/CuUo-GuR.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CByQi_Hd.js')),
			__memo(() => import('./chunks/1-Dee_Ccqx.js')),
			__memo(() => import('./chunks/2-Du3vFmrd.js')),
			__memo(() => import('./chunks/3-D8m98R9o.js')),
			__memo(() => import('./chunks/4-DSxLtibI.js')),
			__memo(() => import('./chunks/5-CI_lRX-I.js')),
			__memo(() => import('./chunks/6-DjruAUFu.js')),
			__memo(() => import('./chunks/7-vYcAexJa.js')),
			__memo(() => import('./chunks/8-DhIM0kM9.js'))
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
