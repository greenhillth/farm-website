import CONFIG from './config';

export function linearGradientCSS(colors: string[], stopsPct: number[]): string {
	const parts = colors.map((c, i) => `${c} ${Math.round(stopsPct[i])}%`);
	return `linear-gradient(to right, ${parts.join(', ')})`;
}
export function uploadEndpoint(mode: 'manual' | 'import'): string {
	return CONFIG.backend.upload.test[mode];
}
