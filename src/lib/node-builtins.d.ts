// @types/node is not a project dependency: this frontend app's src otherwise never
// touches Node builtins. home-items.test.ts (a node-run vitest test) needs typed
// `node:fs` and `node:url` imports to check static/ files on disk, so the minimal
// surface it uses is declared here as an ambient module instead of adding a
// devDependency outside the plan that introduced the test.
declare module 'node:fs' {
	export function existsSync(path: string): boolean;
	export function statSync(path: string): { size: number };
}
declare module 'node:url' {
	export function fileURLToPath(url: URL | string): string;
}
