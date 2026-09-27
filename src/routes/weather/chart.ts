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
					row.temp_c != null && row.humidity_pct != null && row.humidity_pct > 0
						? dewPointC(row.temp_c, row.humidity_pct)
						: null
			}
		]
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
				label: 'Rain in the past hour',
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
	}
};

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

export function hourlyRows(series: ChartSeries[]): { t: number; values: (number | null)[] }[] {
	const rows = new Map<number, (number | null)[]>();
	series.forEach((line, index) => {
		for (const point of line.points) {
			const hour = new Date(point.t);
			hour.setMinutes(0, 0, 0);
			const key = hour.getTime();
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
