const HTML_ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/** Escapes text for an HTML string, e.g. Leaflet tooltip content, which is parsed as HTML. */
export function escapeHtml(value: unknown): string {
	return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
