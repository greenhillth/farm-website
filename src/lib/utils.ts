import CONFIG from './config';

export function linearGradientCSS(colors: string[], stopsPct: number[]): string {
	const parts = colors.map((c, i) => `${c} ${Math.round(stopsPct[i])}%`);
	return `linear-gradient(to right, ${parts.join(', ')})`;
}
export function $(sel: string, root: Document | HTMLElement = document): HTMLElement | null {
	return (root as Document).querySelector
		? ((root as Document).querySelector(sel) as HTMLElement | null)
		: ((root as HTMLElement).querySelector(sel) as HTMLElement | null);
}
export function fmt(n: unknown): string {
	return Number.isFinite(n) ? String(Math.round(Number(n))) : '–';
}
export function uploadEndpoint(mode: 'manual' | 'import'): string {
	return CONFIG.backend.upload.test[mode];
}
