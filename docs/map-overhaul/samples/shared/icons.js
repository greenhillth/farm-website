// Glyphs for map assets: 24×24, stroke only, drawn to match the heroicons-style strokes the
// app already uses. Each glyph must read at 16px inside a 28px badge on satellite imagery,
// so shapes are bold and few. Colour never carries the type: the glyph does.

window.GLYPHS = {
	pole: '<path d="M12 3v18M5 7h14M7 7v2.5M17 7v2.5M9.5 21h5"/><circle cx="12" cy="5" r="0.6"/>',
	power_line:
		'<path d="M3 18 9 7l6 10 6-11"/><circle cx="9" cy="7" r="1.4"/><circle cx="15" cy="17" r="1.4"/>',
	elec_meter: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="m13 7-3 5h4l-3 5"/>',
	water_meter:
		'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5c1.8 2.4 2.8 3.8 2.8 5.2a2.8 2.8 0 0 1-5.6 0c0-1.4 1-2.8 2.8-5.2Z"/>',
	pump: '<circle cx="10.5" cy="13.5" r="6.5"/><path d="M10.5 7h8.5v5M13 13.5l-4-2.5v5z"/>',
	dam: '<path d="M3 9c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0M3 14c2-1.8 4-1.8 6 0s4 1.8 6 0 4-1.8 6 0M5 19h14"/>',
	water_main: '<path d="M3 9h18M3 15h18M7.5 6.5v11M16.5 6.5v11"/>',
	valve: '<path d="M4 8v8l16-8v8zM12 12V5M9 5h6"/>',
	pivot:
		'<circle cx="12" cy="12" r="8.5"/><path d="m12 12 6-6"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
	linear:
		'<path d="M3 8h18M6 8v8M12 8v8M18 8v8"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
	road: '<path d="M8.5 3 5 21M15.5 3 19 21M12 4.5v3M12 10.5v3M12 16.5v3"/>',
	gate: '<path d="M4 4.5v15M20 4.5v15M4 8h16M4 12h16M4 16h16M4 16 20 8"/>',
	fence: '<path d="M5 5v15M12 5v15M19 5v15M3 9h18M3 14h18"/>',
	tank: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
	building: '<path d="M3 11 12 4l9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>',
	weather:
		'<path d="M12 21V10M12 10 6.5 6.5M12 10l5.5-3.5M12 10V4"/><circle cx="6" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="12" cy="3.5" r="1.4"/>',
	probe:
		'<path d="M12 21V11M9.5 21h5"/><circle cx="12" cy="9" r="2"/><path d="M8.2 5.5a5.5 5.5 0 0 0 0 7M15.8 5.5a5.5 5.5 0 0 1 0 7"/>',
	paddock: '<path d="M4 7.5 11 4l9 4-2 11-11 1z"/>',
	title: '<path d="M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h5"/>'
};

/** An inline SVG for a glyph, sized by CSS. */
window.glyphSvg = function glyphSvg(name) {
	return (
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
		'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		(window.GLYPHS[name] ?? window.GLYPHS.paddock) +
		'</svg>'
	);
};

/**
 * The map marker for a point asset: a dark disc with a light glyph. The ring shows live status
 * (running, warning, fault, offline) and an optional chip beside it shows one live value.
 */
window.badgeHtml = function badgeHtml({ glyph, status = 'none', chip = null, extra = '' }) {
	const chipHtml = chip ? `<span class="badge-chip">${chip}</span>` : '';
	return `<span class="badge status-${status} ${extra}">${window.glyphSvg(glyph)}</span>${chipHtml}`;
};

/** Words for each live status. Status is never shown by colour alone. */
window.STATUS_WORDS = {
	none: 'No live data',
	running: 'Running',
	idle: 'Stopped',
	warn: 'Warning',
	fault: 'Fault',
	offline: 'Offline'
};
