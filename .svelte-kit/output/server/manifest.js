export const manifest = (() => {
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
		client: {start:"_app/immutable/entry/start.BLXIhdgN.js",app:"_app/immutable/entry/app.ZsmPmL1b.js",imports:["_app/immutable/entry/start.BLXIhdgN.js","_app/immutable/chunks/DyXCNgKf.js","_app/immutable/chunks/BAbRxsGe.js","_app/immutable/chunks/CEDlyOlD.js","_app/immutable/chunks/BR-ZO3Vo.js","_app/immutable/chunks/DR11qvyx.js","_app/immutable/entry/app.ZsmPmL1b.js","_app/immutable/chunks/CEDlyOlD.js","_app/immutable/chunks/BR-ZO3Vo.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BAbRxsGe.js","_app/immutable/chunks/DR11qvyx.js","_app/immutable/chunks/CH8uQorz.js","_app/immutable/chunks/iXGh358t.js","_app/immutable/chunks/BM_KlDUF.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js'))
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
				id: "/weather",
				pattern: /^\/weather\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
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
