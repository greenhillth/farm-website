import { describe, expect, it } from 'vitest';

import {
	CHARTS,
	buildSeries,
	extremes,
	hourTicks,
	hourlyRows,
	parseUtcMs,
	segments,
	tickFormat,
	timeTicks,
	wellFilled
} from './chart';

const rows = [
	{
		timestamp_utc: '2026-09-26 02:00:00',
		temp_c: 12,
		humidity_pct: 80,
		wind_avg_ms: 5,
		wind_gust_ms: 8
	},
	{
		timestamp_utc: '2026-09-26 01:00:00',
		temp_c: 10,
		humidity_pct: 90,
		wind_avg_ms: null,
		wind_gust_ms: 6
	},
	{ timestamp_utc: 'not a time', temp_c: 99 }
];

describe('parseUtcMs', () => {
	it('reads backend timestamps as UTC', () => {
		expect(parseUtcMs('2026-09-26 01:00:00')).toBe(Date.UTC(2026, 8, 26, 1));
		expect(parseUtcMs('2026-09-26T01:00:00+10:00')).toBe(Date.UTC(2026, 8, 25, 15));
		expect(parseUtcMs('nonsense')).toBeNull();
	});
});

describe('buildSeries', () => {
	it('charts temperature and dew point for outdoor, oldest first, skipping bad rows', () => {
		const [temp, dew] = buildSeries(rows, CHARTS.outdoor!);
		expect(temp.label).toBe('Temperature');
		expect(temp.points.map((p) => p.v)).toEqual([10, 12]);
		expect(dew.label).toBe('Dew point');
		expect(dew.points[0].v).toBeCloseTo(8.4, 1);
	});

	it('charts wind in km/h and leaves out missing readings', () => {
		const [average, gust] = buildSeries(rows, CHARTS.wind!);
		expect(CHARTS.wind!.unit).toBe('km/h');
		expect(average.points.map((p) => p.v)).toEqual([18]);
		expect(gust.points.map((p) => Math.round(p.v))).toEqual([22, 29]);
	});
});

describe('hourTicks', () => {
	it('marks every 6 hours on the local clock', () => {
		const from = new Date(2026, 8, 26, 1, 30).getTime();
		const ticks = hourTicks(from, from + 24 * 3600_000);
		expect(ticks.map((t) => new Date(t).getHours())).toEqual([6, 12, 18, 0]);
	});
});

describe('hourlyRows', () => {
	it('keeps the last value per hour for each series', () => {
		const hour = new Date(2026, 8, 26, 9).getTime();
		const series = [
			{
				label: 'A',
				colour: '',
				points: [
					{ t: hour + 60_000, v: 1 },
					{ t: hour + 120_000, v: 2 }
				]
			},
			{ label: 'B', colour: '', points: [{ t: hour + 3600_000, v: 5 }] }
		];
		expect(hourlyRows(series)).toEqual([
			{ t: hour, values: [2, null] },
			{ t: hour + 3600_000, values: [null, 5] }
		]);
	});
});

describe('extremes', () => {
	it('finds the high and low, or null without points', () => {
		expect(
			extremes([
				{ t: 0, v: 3 },
				{ t: 1, v: -1 },
				{ t: 2, v: 7 }
			])
		).toEqual({ high: 7, low: -1 });
		expect(extremes([])).toBeNull();
	});
});

describe('segments', () => {
	it('breaks a line where readings stop for longer than the gap', () => {
		const points = [0, 60_000, 120_000, 3_600_000, 3_660_000].map((t) => ({ t, v: 1 }));

		expect(segments(points, 10 * 60_000).map((s) => s.length)).toEqual([3, 2]);
		expect(segments([], 60_000)).toEqual([]);
	});
});

describe('timeTicks and tickFormat', () => {
	const at = (month: number, day: number) => new Date(2026, month, day).getTime();

	it('uses hours for a day, days for a week, and months for a year', () => {
		const dayTicks = timeTicks(at(8, 26), at(8, 27));
		expect(dayTicks.every((t) => new Date(t).getHours() % 6 === 0)).toBe(true);

		const weekTicks = timeTicks(at(8, 20), at(8, 27));
		expect(weekTicks).toHaveLength(8); // both ends are midnights
		expect(weekTicks.every((t) => new Date(t).getHours() === 0)).toBe(true);

		const monthTicks = timeTicks(at(8, 27) - 30 * 86_400_000, at(8, 27));
		expect(monthTicks.map((t) => new Date(t).getDate())).toEqual([1, 8, 15, 22]);

		const yearTicks = timeTicks(at(8, 27) - 365 * 86_400_000, at(8, 27));
		expect(yearTicks.every((t) => new Date(t).getDate() === 1)).toBe(true);
		expect(yearTicks.length).toBeGreaterThanOrEqual(11);

		expect(tickFormat(at(8, 20), at(8, 27)).format(at(8, 21))).toBe('21 Sept');
		expect(tickFormat(at(0, 1), at(11, 31)).format(at(2, 1))).toBe('Mar');
	});
});

describe('wellFilled', () => {
	it('drops buckets with far fewer readings than usual, like a day cut short', () => {
		const rows = [10, 12, 11, 6, 12].map((count, i) => ({ timestamp_utc: String(i), count }));

		expect(wellFilled(rows).map((row) => row.count)).toEqual([10, 12, 11, 12]);
		expect(
			wellFilled<{ timestamp_utc: string; count?: number }>([{ timestamp_utc: 'raw' }])
		).toHaveLength(1);
	});
});

describe('rain chart', () => {
	it('charts rain since midnight, from the older column when the new one is missing', () => {
		const rows = [
			{ timestamp_utc: '2026-03-01T06:00:00+00:00', rain_24h_mm: 3.2 },
			{ timestamp_utc: '2026-09-28T06:00:00+00:00', rain_24h_mm: 9, rain_daily_mm: 4 }
		];

		const [daily] = buildSeries(rows, CHARTS.rain!);

		expect(daily.label).toBe('Since midnight');
		expect(daily.points.map((p) => p.v)).toEqual([3.2, 4]);
	});
});
