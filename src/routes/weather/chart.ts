import { dewPointC, type WeatherHistoryRow } from '$lib/weather';

export type ChartPoint = { t: number; v: number };
export type ChartSeries = { label: string; colour: string; points: ChartPoint[] };
export type ChartSpec = {
	unit: string;
	series: {
		label: string;
		colour: string;
		value: (row: WeatherHistoryRow) => number | null | undefined;
	}[];
};

const kmh = (ms: number | null | undefined) => (ms === null || ms === undefined ? null : ms * 3.6);

/** Series to chart for each weather detail page; metrics missing here have no history to chart. */
export const CHARTS: Partial<Record<string, ChartSpec>> = {
	outdoor: {
		unit: '°C',
		series: [
			{ label: 'Temperature', colour: '#facc15', value: (row) => row.temp_c },
			{
				label: 'Dew point',
				colour: 'rgb(var(--status-high))',
				value: (row) =>
					row.dew_point_c ??
					(row.temp_c != null && row.humidity_pct != null && row.humidity_pct > 0
						? dewPointC(row.temp_c, row.humidity_pct)
						: null)
			}
		]
	},
	humidity: {
		unit: '%',
		series: [
			{ label: 'Outdoor', colour: 'rgb(var(--accent))', value: (row) => row.humidity_pct },
			{ label: 'Indoor', colour: '#c4b5fd', value: (row) => row.indoor_humidity_pct }
		]
	},
	indoor: {
		unit: '°C',
		series: [{ label: 'Indoor', colour: '#fb923c', value: (row) => row.indoor_temp_c }]
	},
	wind: {
		unit: 'km/h',
		series: [
			{ label: 'Average', colour: 'rgb(var(--accent))', value: (row) => kmh(row.wind_avg_ms) },
			{ label: 'Gust', colour: 'rgb(var(--warn))', value: (row) => kmh(row.wind_gust_ms) }
		]
	},
	rain: {
		unit: 'mm',
		series: [
			{
				// Until gbros-api#15, rain since midnight was stored as rain_24h_mm.
				label: 'Since midnight',
				colour: 'rgb(var(--accent))',
				value: (row) => row.rain_daily_mm ?? row.rain_24h_mm
			},
			{
				label: 'Past hour',
				colour: 'rgb(var(--status-high))',
				value: (row) => row.rain_1h_mm
			}
		]
	},
	pressure: {
		unit: 'hPa',
		series: [{ label: 'Pressure', colour: '#c4b5fd', value: (row) => row.pressure_hpa }]
	},
	solar: {
		unit: 'W/m²',
		series: [{ label: 'Solar', colour: '#facc15', value: (row) => row.solar_wm2 }]
	},
	uv: {
		unit: 'UVI',
		series: [{ label: 'UV index', colour: '#a78bfa', value: (row) => row.uvi }]
	}
};

/** The metrics offered in the chart's selector, in order. Keys are CHARTS keys. */
export const CHART_METRICS: readonly { key: string; label: string }[] = [
	{ key: 'outdoor', label: 'Temperature and dew point' },
	{ key: 'humidity', label: 'Humidity' },
	{ key: 'wind', label: 'Wind' },
	{ key: 'rain', label: 'Rain' },
	{ key: 'pressure', label: 'Pressure' },
	{ key: 'solar', label: 'Solar radiation' },
	{ key: 'uv', label: 'UV index' },
	{ key: 'indoor', label: 'Indoor temperature' }
];

/** `points` sets the /series bucket (span ÷ points): whole divisions of a day, so the
 *  buckets don't beat against the day/night cycle and draw a false zigzag. */
export type Timespan = { key: string; label: string; seconds: number; points: number };

const DAY = 24 * 60 * 60;
export const TIMESPANS: readonly Timespan[] = [
	{ key: '24h', label: '24 hours', seconds: DAY, points: 480 },
	{ key: '7d', label: '7 days', seconds: 7 * DAY, points: 7 * 48 }, // 30 minutes
	{ key: '30d', label: '30 days', seconds: 30 * DAY, points: 30 * 12 }, // 2 hours
	{ key: '1y', label: '1 year', seconds: 365 * DAY, points: 365 } // 1 day
];

/**
 * Drop buckets holding under three quarters of the readings their neighbours hold (the
 * median of up to `reach` buckets either side). A day cut short by an outage averages only
 * the hours it has, e.g. just an afternoon, and would spike. Comparing with neighbours
 * rather than the whole span keeps periods recorded more sparsely: history backfilled from
 * EcoWitt has 48 or 288 readings a day, not 1,440.
 */
export function wellFilled<T extends { count?: number }>(rows: readonly T[], reach = 3): T[] {
	return rows.filter((row, i) => {
		if (typeof row.count !== 'number') return true;
		const around = rows
			.slice(Math.max(0, i - reach), i + reach + 1)
			.map((other) => other.count)
			.filter((count): count is number => typeof count === 'number')
			.sort((a, b) => a - b);
		return row.count >= around[Math.floor(around.length / 2)] * 0.75;
	});
}

/**
 * Split a line where readings stop for longer than `maxGapMs`, so outages (like the
 * collector being down from March to September 2026) show as gaps, not straight lines.
 */
export function segments(points: ChartPoint[], maxGapMs: number): ChartPoint[][] {
	const out: ChartPoint[][] = [];
	for (const point of points) {
		const current = out.at(-1);
		const last = current?.at(-1);
		if (current && last && point.t - last.t <= maxGapMs) current.push(point);
		else out.push([point]);
	}
	return out;
}

/** Axis marks for a span: every 6 hours up to 2 days, then days, then months. */
export function timeTicks(from: number, to: number): number[] {
	const span = to - from;
	if (span <= 2 * DAY * 1000) return hourTicks(from, to);
	const tick = new Date(from);
	tick.setHours(0, 0, 0, 0);
	const monthly = span > 90 * DAY * 1000;
	if (monthly) tick.setDate(1);
	// Daily for a week; otherwise the 1st, 8th, 15th and 22nd, so month ends don't crowd.
	const daily = span <= 10 * DAY * 1000;
	const ticks: number[] = [];
	while (tick.getTime() <= to) {
		if (tick.getTime() >= from && (monthly || daily || [1, 8, 15, 22].includes(tick.getDate()))) {
			ticks.push(tick.getTime());
		}
		if (monthly) tick.setMonth(tick.getMonth() + 1);
		else tick.setDate(tick.getDate() + 1);
	}
	return ticks;
}

/** Tick labels to match timeTicks: hours, then day and month, then month names. */
export function tickFormat(from: number, to: number): Intl.DateTimeFormat {
	const span = to - from;
	if (span <= 2 * DAY * 1000) return new Intl.DateTimeFormat('en-AU', { hour: 'numeric' });
	if (span <= 90 * DAY * 1000) {
		return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' });
	}
	return new Intl.DateTimeFormat('en-AU', { month: 'short' });
}

/** Backend timestamps are UTC, often without a zone ("2026-09-26 01:00:00"). */
export function parseUtcMs(value: string): number | null {
	const trimmed = value.trim();
	const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
	const iso = trimmed.replace(' ', 'T');
	const ms = new Date(hasZone ? iso : `${iso}Z`).getTime();
	return Number.isNaN(ms) ? null : ms;
}

export function buildSeries(history: readonly WeatherHistoryRow[], spec: ChartSpec): ChartSeries[] {
	const timed = history
		.map((row) => ({ row, t: parseUtcMs(String(row.timestamp_utc ?? '')) }))
		.filter((entry): entry is { row: WeatherHistoryRow; t: number } => entry.t !== null)
		.sort((a, b) => a.t - b.t);

	return spec.series.map(({ label, colour, value }) => ({
		label,
		colour,
		points: timed.flatMap(({ row, t }) => {
			const v = value(row);
			return typeof v === 'number' && Number.isFinite(v) ? [{ t, v }] : [];
		})
	}));
}

export function hourTicks(from: number, to: number, every = 6): number[] {
	const tick = new Date(from);
	tick.setMinutes(0, 0, 0);
	if (tick.getTime() < from) tick.setHours(tick.getHours() + 1);
	while (tick.getHours() % every !== 0) tick.setHours(tick.getHours() + 1);

	const ticks: number[] = [];
	while (tick.getTime() <= to) {
		ticks.push(tick.getTime());
		tick.setHours(tick.getHours() + every);
	}
	return ticks;
}

const startOfHour = (t: number) => {
	const hour = new Date(t);
	hour.setMinutes(0, 0, 0);
	return hour.getTime();
};

/** Table rows for screen readers: one per `rowKey(t)` (by default, per hour), last value wins. */
export function hourlyRows(
	series: ChartSeries[],
	rowKey: (t: number) => number = startOfHour
): { t: number; values: (number | null)[] }[] {
	const rows = new Map<number, (number | null)[]>();
	series.forEach((line, index) => {
		for (const point of line.points) {
			const key = rowKey(point.t);
			const values = rows.get(key) ?? series.map(() => null);
			values[index] = point.v;
			rows.set(key, values);
		}
	});
	return [...rows.entries()].sort(([a], [b]) => a - b).map(([t, values]) => ({ t, values }));
}

export function extremes(points: ChartPoint[]): { high: number; low: number } | null {
	if (points.length === 0) return null;
	const values = points.map((point) => point.v);
	return { high: Math.max(...values), low: Math.min(...values) };
}
