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
		client: {start:"_app/immutable/entry/start.CkNzATNI.js",app:"_app/immutable/entry/app.DCBXBAuU.js",imports:["_app/immutable/entry/start.CkNzATNI.js","_app/immutable/chunks/Cqe1jwgo.js","_app/immutable/chunks/i2KPoIqR.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/Ckc-z1rI.js","_app/immutable/entry/app.DCBXBAuU.js","_app/immutable/chunks/CdmsYw1U.js","_app/immutable/chunks/BUMWtct1.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/i2KPoIqR.js","_app/immutable/chunks/Ckc-z1rI.js","_app/immutable/chunks/Bdri3CNH.js","_app/immutable/chunks/Bpw-ON10.js","_app/immutable/chunks/DNrX4qGI.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BJKO_v48.js')),
			__memo(() => import('./chunks/1-a_7SBhuA.js')),
			__memo(() => import('./chunks/2-C-ewGgpJ.js')),
			__memo(() => import('./chunks/3-Dfs6gDCW.js')),
			__memo(() => import('./chunks/4-DQb_OE-8.js')),
			__memo(() => import('./chunks/5-BbhTAcQs.js')),
			__memo(() => import('./chunks/6-BcnlSDNC.js')),
			__memo(() => import('./chunks/7-CUmrL6mp.js')),
			__memo(() => import('./chunks/8-4UNRgU0F.js')),
			__memo(() => import('./chunks/9-DJGadGkC.js'))
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
				id: "/soiltests",
				pattern: /^\/soiltests\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/timesheet",
				pattern: /^\/timesheet\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/weather",
				pattern: /^\/weather\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/weather/[metric]",
				pattern: /^\/weather\/([^/]+?)\/?$/,
				params: [{"name":"metric","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
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
