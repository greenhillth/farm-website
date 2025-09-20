import type { PathOptions, TileLayerOptions } from 'leaflet';

import type { MetricId, MetricOption } from '$lib/config';
import { DEFAULT_PADDOCK_STYLE } from '$lib/layers';

export type QuickLink = { href: string; label: string };

export const quickLinks: QuickLink[] = [
	{ href: '/', label: 'Back to home' },
	{ href: '/paddocks', label: 'Paddock manager' },
	{ href: '/soiltests', label: 'Soil tests' },
	{ href: '/weather', label: 'Weather station' }
];

export type BaseLayerConfig = {
	id: string;
	label: string;
	description: string;
	url: string;
	options: TileLayerOptions;
};

export type SoilTestRecord = Record<string, unknown>;

export type NormalisedSoilSample = {
	fieldId: string;
	sampleDate: string | null;
	sampleDateMs: number | null;
	sampleName: string | null;
	metrics: Partial<Record<MetricId, number>>;
	raw: SoilTestRecord;
};

export type MetricStats = {
	min: number;
	max: number;
	mean: number;
	median: number;
	count: number;
};

export type LegendPercents = {
	lowPct: number;
	highPct: number;
	showOpt: boolean;
	optLoPct: number;
	optHiPct: number;
	optWidth: number;
	optMidPct: number;
};

export const EMPTY_LEGEND_PERCENTS: LegendPercents = {
	lowPct: 0,
	highPct: 0,
	showOpt: false,
	optLoPct: 0,
	optHiPct: 0,
	optWidth: 0,
	optMidPct: 0
};

export type LegendDetails = {
	min: { value: number | null; fields: string[] };
	max: { value: number | null; fields: string[] };
	opt: {
		range: [number, number] | null;
		within: { count: number; pct: number; total: number };
	};
};

export const EMPTY_LEGEND_DETAILS: LegendDetails = {
	min: { value: null, fields: [] },
	max: { value: null, fields: [] },
	opt: {
		range: null,
		within: { count: 0, pct: 0, total: 0 }
	}
};

export const VIRIDIS_STOPS = ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'];
export const VIRIDIS_GRADIENT = `linear-gradient(to right, ${VIRIDIS_STOPS.map((color, index) => {
	const pct = (100 * index) / (VIRIDIS_STOPS.length - 1);
	return `${color} ${pct.toFixed(1)}%`;
}).join(', ')})`;

export const NO_DATA_STYLE = {
	fillColor: '#1f2937',
	fillOpacity: 0.25,
	color: '#2f3748',
	weight: 1
};

const METRIC_VALUE_KEYS: Record<MetricId, string[]> = {
	none: [],
	OM: ['OM', 'om', 'OrganicMatter', 'organic_matter', 'total_C', 'Total_C'],
	P: ['P', 'p', 'Phosphorus'],
	K: ['K', 'k', 'Potassium'],
	M: ['Mg', 'mg', 'Magnesium', 'magnesium'],
	Ca: ['Ca', 'ca', 'Calcium', 'calcium'],
	pH: ['ph_water', 'pH', 'ph', 'ph_H2O', 'ph_h2o']
};

const FIELD_ID_KEYS = [
	'fieldID',
	'fieldId',
	'FIELDID',
	'FIELD_ID',
	'ADSFLDID',
	'adsfldid',
	'field_id',
	'id_field',
	'paddockId',
	'paddock_id'
];

export function normaliseFieldId(value: unknown): string {
	if (value === null || value === undefined) return '';
	const text = String(value).trim();
	return text;
}

export function extractFieldId(record: SoilTestRecord): string {
	for (const key of FIELD_ID_KEYS) {
		if (key in record) {
			const candidate = normaliseFieldId(record[key]);
			if (candidate) return candidate;
		}
	}
	return '';
}

export function toNumber(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const candidate = typeof value === 'string' ? value.trim() : value;
	if (candidate === '') return null;
	const num = Number(candidate);
	return Number.isFinite(num) ? num : null;
}

export function pickMetricValue(record: SoilTestRecord, metricId: MetricId): number | null {
	const keys = METRIC_VALUE_KEYS[metricId] ?? [];
	for (const key of keys) {
		if (!(key in record)) continue;
		const candidate = toNumber(record[key]);
		if (candidate !== null) return candidate;
	}
	return null;
}

export function parseDateMs(value: unknown): number | null {
	if (!value) return null;
	const timestamp = Date.parse(String(value));
	return Number.isNaN(timestamp) ? null : timestamp;
}

export function hexToRgb(hex: string): [number, number, number] {
	const clean = hex.replace('#', '');
	const int = parseInt(clean, 16);
	return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
	return `#${[r, g, b]
		.map((value) => Math.max(0, Math.min(255, value)))
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('')}`;
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function lerpColor(a: string, b: string, t: number): string {
	const [ar, ag, ab] = hexToRgb(a);
	const [br, bg, bb] = hexToRgb(b);
	return rgbToHex([
		Math.round(lerp(ar, br, t)),
		Math.round(lerp(ag, bg, t)),
		Math.round(lerp(ab, bb, t))
	]);
}

export function clamp(value: number, min = 0, max = 1): number {
	if (Number.isNaN(value)) return min;
	if (max < min) {
		const tmp = min;
		min = max;
		max = tmp;
	}
	return Math.max(min, Math.min(max, value));
}

export function toPct(value: number, min: number, max: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
	if (max === min) return 0;
	return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export function viridisColor(value: number, min: number, max: number): string {
	if (Number.isNaN(value) || !Number.isFinite(value)) {
		return VIRIDIS_STOPS[0];
	}
	const span = max - min;
	const safeSpan = span === 0 ? 1 : span;
	const t = clamp((value - min) / safeSpan, 0, 1);
	const scaled = t * (VIRIDIS_STOPS.length - 1);
	const idx = Math.floor(scaled);
	const nextIdx = Math.min(VIRIDIS_STOPS.length - 1, idx + 1);
	const localT = scaled - idx;
	return lerpColor(VIRIDIS_STOPS[idx], VIRIDIS_STOPS[nextIdx], localT);
}

export function derivePaddockIdentity(props: Record<string, unknown>) {
	const name =
		(props.FIELDNAME as string | undefined) ??
		(props.fieldName as string | undefined) ??
		(props.FIELD_NAME as string | undefined) ??
		(props.name as string | undefined) ??
		(props.Name as string | undefined) ??
		'Unnamed paddock';
	const displayCandidates = [
		props.ADSFLDID,
		props.fieldID,
		props.FIELDID,
		props.FIELD_ID,
		props.fieldId,
		props.id,
		props.Id
	];
	const displayValue = displayCandidates.find(
		(candidate) =>
			candidate !== null && candidate !== undefined && String(candidate).trim() !== ''
	);
	const displayId = displayValue === undefined ? '–' : String(displayValue);
	const fieldId = extractFieldId(props as SoilTestRecord) || normaliseFieldId(displayValue);
	return { name, displayId, fieldId };
}

export const valueFormatter = new Intl.NumberFormat('en-AU', {
	maximumFractionDigits: 2,
	minimumFractionDigits: 0
});

export const percentFormatter = new Intl.NumberFormat('en-AU', {
	maximumFractionDigits: 1,
	minimumFractionDigits: 0
});

export function formatLegendTick(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) return '–';
	return valueFormatter.format(value);
}

export function formatMetricValue(value: number | undefined, metric: MetricOption): string {
	if (value === undefined || value === null || Number.isNaN(value)) {
		return 'No data';
	}
	const abs = Math.abs(value);
	const decimals = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
	const formatted = value
		.toFixed(decimals)
		.replace(/\.0+$/, '')
		.replace(/(\.\d*[1-9])0+$/, '$1');
	return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

export function formatSampleDate(value: string | null): string {
	if (!value) return '';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString('en-AU', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function formatPercent(value: number | null | undefined): string {
	if (value === null || value === undefined || Number.isNaN(value)) return '0%';
	return `${percentFormatter.format(value)}%`;
}

export function formatFieldList(fields: string[], limit = 5): string {
	if (!fields || fields.length === 0) return 'None';
	if (fields.length <= limit) return fields.join(', ');
	const shown = fields.slice(0, limit).join(', ');
	return `${shown}, +${fields.length - limit} more`;
}

export function keepTooltipInView(node: HTMLElement) {
	const owner = node.parentElement ?? node;
	const boundary = owner.closest('[data-tooltip-boundary]') as HTMLElement | null;
	let frame = 0;
	let observingResize = false;

	const resetTransform = () => {
		node.style.setProperty('--tw-translate-x', 'calc(-50% + 0px)');
	};

	const updatePosition = () => {
		resetTransform();
		const rect = node.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return;
		const padding = 8;
		const boundaryRect = boundary?.getBoundingClientRect();
		const minX = (boundaryRect?.left ?? 0) + padding;
		const maxX = (boundaryRect?.right ?? window.innerWidth) - padding;
		const leftOverflow = minX - rect.left;
		const rightOverflow = rect.right - maxX;
		let shift = 0;
		if (leftOverflow > 0) {
			shift = leftOverflow;
		} else if (rightOverflow > 0) {
			shift = -rightOverflow;
		}
		node.style.setProperty('--tw-translate-x', `calc(-50% + ${shift}px)`);
	};

	const scheduleUpdate = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			requestAnimationFrame(updatePosition);
			if (!observingResize) {
				window.addEventListener('resize', updatePosition, { passive: true });
				boundary?.addEventListener('scroll', updatePosition, { passive: true });
				observingResize = true;
			}
		});
	};

	const handleHide = () => {
		cancelAnimationFrame(frame);
		if (observingResize) {
			window.removeEventListener('resize', updatePosition);
			boundary?.removeEventListener('scroll', updatePosition);
			observingResize = false;
		}
		resetTransform();
	};

	const onMouseEnter: EventListener = () => scheduleUpdate();
	const onFocus: EventListener = () => scheduleUpdate();
	const onMouseLeave: EventListener = () => handleHide();
	const onBlur: EventListener = () => handleHide();

	owner.addEventListener('mouseenter', onMouseEnter, { passive: true });
	owner.addEventListener('focus', onFocus);
	owner.addEventListener('mouseleave', onMouseLeave, { passive: true });
	owner.addEventListener('blur', onBlur);

	return {
		destroy() {
			owner.removeEventListener('mouseenter', onMouseEnter);
			owner.removeEventListener('focus', onFocus);
			owner.removeEventListener('mouseleave', onMouseLeave);
			owner.removeEventListener('blur', onBlur);
			handleHide();
		}
	};
}

export function setLayerBaseStyle(layer: any, style: Partial<PathOptions>) {
	if (!layer || typeof layer.setStyle !== 'function') return;
	const nextStyle = {
		...DEFAULT_PADDOCK_STYLE,
		...style
	};
	layer.__baseStyle = nextStyle;
	layer.setStyle(nextStyle);
}

export function updatePaddockTooltip(layer: any, html: string) {
	if (typeof layer.getTooltip === 'function') {
		const existing = layer.getTooltip();
		if (existing) {
			existing.setContent(html);
			return;
		}
	}
	if (typeof layer.bindTooltip === 'function') {
		layer.bindTooltip(html, {
			sticky: true,
			direction: 'top',
			className: 'paddock-tooltip',
			opacity: 0.95
		});
	}
}

export function computeMetricStats(
	metric: MetricOption,
	samples: Map<string, NormalisedSoilSample>
): MetricStats | null {
	if (!metric || metric.id === 'none') return null;
	const values: number[] = [];
	samples.forEach((sample) => {
		const value = sample.metrics[metric.id];
		if (typeof value === 'number' && Number.isFinite(value)) {
			values.push(value);
		}
	});
	if (values.length === 0) return null;
	values.sort((a, b) => a - b);
	const min = values[0];
	const max = values[values.length - 1];
	const median = values[Math.floor(values.length / 2)];
	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
	return { min, max, median, mean, count: values.length };
}

export function getFieldDisplayName(
	fieldId: string,
	sample: NormalisedSoilSample | undefined,
	identities: Map<string, { name: string; displayId: string }>
): string {
	const identity = identities.get(fieldId);
	if (identity?.name && identity.name !== 'Unnamed paddock') return identity.name;
	if (identity?.displayId && identity.displayId !== '–') return identity.displayId;
	if (sample?.sampleName) return sample.sampleName;
	return fieldId || 'Unknown paddock';
}

export function computeLegendDetails(
	metric: MetricOption,
	stats: MetricStats | null,
	samples: Map<string, NormalisedSoilSample>,
	identities: Map<string, { name: string; displayId: string }>
): LegendDetails {
	if (!stats || metric.id === 'none') return EMPTY_LEGEND_DETAILS;
	const tolerance = 1e-6;
	const minValue = stats.min;
	const maxValue = stats.max;
	const minFields: string[] = [];
	const maxFields: string[] = [];
	let total = 0;
	let withinCount = 0;
	const [optLoRaw, optHiRaw] = metric.range_optimal ?? [undefined, undefined];
	const hasOptRange =
		typeof optLoRaw === 'number' && typeof optHiRaw === 'number' && optHiRaw > optLoRaw;
	const optRange = hasOptRange ? ([optLoRaw, optHiRaw] as [number, number]) : null;

	samples.forEach((sample, fieldId) => {
		const value = sample.metrics[metric.id];
		if (typeof value !== 'number' || !Number.isFinite(value)) return;
		total += 1;
		if (Math.abs(value - minValue) <= tolerance) {
			minFields.push(getFieldDisplayName(fieldId, sample, identities));
		}
		if (Math.abs(value - maxValue) <= tolerance) {
			maxFields.push(getFieldDisplayName(fieldId, sample, identities));
		}
		if (optRange) {
			const [optLo, optHi] = optRange;
			if (value >= optLo - tolerance && value <= optHi + tolerance) {
				withinCount += 1;
			}
		}
	});

	return {
		min: {
			value: minFields.length ? minValue : null,
			fields: minFields
		},
		max: {
			value: maxFields.length ? maxValue : null,
			fields: maxFields
		},
		opt: {
			range: optRange,
			within: {
				count: withinCount,
				pct: total > 0 ? (withinCount / total) * 100 : 0,
				total
			}
		}
	};
}

export function computeLegendPercents(
	metric: MetricOption,
	stats: MetricStats | null,
	scaleReady: boolean
): LegendPercents {
	if (!scaleReady || !stats) return EMPTY_LEGEND_PERCENTS;
	const { c_min: cMinRaw, c_max: cMaxRaw } = metric;
	if (typeof cMinRaw !== 'number' || typeof cMaxRaw !== 'number') {
		return EMPTY_LEGEND_PERCENTS;
	}

	const cmin = cMinRaw;
	const cmax = cMaxRaw;
	const lowPct = toPct(stats.min, cmin, cmax);
	const highPct = toPct(stats.max, cmin, cmax);

	const [optLoRaw, optHiRaw] = metric.range_optimal ?? [undefined, undefined];
	const showOpt =
		Number.isFinite(optLoRaw) &&
		Number.isFinite(optHiRaw) &&
		typeof optLoRaw === 'number' &&
		typeof optHiRaw === 'number' &&
		optHiRaw > optLoRaw;

	let optLoPct = 0;
	let optHiPct = 0;
	let optWidth = 0;
	let optMidPct = 0;

	if (showOpt) {
		const optLo = optLoRaw as number;
		const optHi = optHiRaw as number;
		optLoPct = toPct(optLo, cmin, cmax);
		optHiPct = toPct(optHi, cmin, cmax);
		optWidth = Math.max(0, optHiPct - optLoPct);
		optMidPct = (optLoPct + optHiPct) / 2;
	}

	return {
		lowPct,
		highPct,
		showOpt,
		optLoPct,
		optHiPct,
		optWidth,
		optMidPct
	};
}
