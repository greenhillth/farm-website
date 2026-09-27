import { metricColumns, type MetricKey, type SoilTest } from './schema';

export type PrimarySortColumn = 'date' | 'sample' | 'paddock' | 'farm' | 'client';
export type SortState =
	| { type: PrimarySortColumn; direction: 'asc' | 'desc' }
	| { type: 'metric'; key: MetricKey; direction: 'asc' | 'desc' };

export const DEFAULT_SORT: SortState = { type: 'date', direction: 'desc' };

const PRIMARY: readonly string[] = ['date', 'sample', 'paddock', 'farm', 'client'];
const TEXT_KEYS: Record<Exclude<PrimarySortColumn, 'date'>, (test: SoilTest) => string> = {
	sample: (test) => test.sampleName ?? '',
	paddock: (test) => test.paddockName,
	farm: (test) => test.farm ?? '',
	client: (test) => test.client ?? ''
};

/** Missing values sort last whichever way the list is ordered. */
function byNumber(a: number | undefined, b: number | undefined, sign: number) {
	const aMissing = a === undefined || Number.isNaN(a);
	const bMissing = b === undefined || Number.isNaN(b);
	if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
	return sign * (a - b);
}

const dateMs = (test: SoilTest) =>
	test.sampleDate ? new Date(test.sampleDate).getTime() : undefined;

export function sortTests(list: readonly SoilTest[], state: SortState): SoilTest[] {
	const sign = state.direction === 'desc' ? -1 : 1;
	const copy = [...list];
	if (state.type === 'metric') {
		return copy.sort((a, b) => byNumber(a.metrics[state.key], b.metrics[state.key], sign));
	}
	if (state.type === 'date') {
		return copy.sort((a, b) => byNumber(dateMs(a), dateMs(b), sign));
	}
	const key = TEXT_KEYS[state.type];
	return copy.sort(
		(a, b) => sign * key(a).localeCompare(key(b), undefined, { numeric: true, sensitivity: 'base' })
	);
}

export function nextSort(state: SortState, column: PrimarySortColumn | MetricKey): SortState {
	if (PRIMARY.includes(column)) {
		const primary = column as PrimarySortColumn;
		if (state.type === primary) {
			return { type: primary, direction: state.direction === 'desc' ? 'asc' : 'desc' };
		}
		return { type: primary, direction: primary === 'date' ? 'desc' : 'asc' };
	}
	const key = column as MetricKey;
	if (state.type === 'metric' && state.key === key) {
		return state.direction === 'desc' ? { type: 'metric', key, direction: 'asc' } : DEFAULT_SORT;
	}
	return { type: 'metric', key, direction: 'desc' };
}

const PRIMARY_LABELS: Record<Exclude<PrimarySortColumn, 'date'>, string> = {
	sample: 'Sample name',
	paddock: 'Paddock',
	farm: 'Farm',
	client: 'Client'
};

export function describeSort(state: SortState): string {
	if (state.type === 'date') return state.direction === 'desc' ? 'Newest first' : 'Oldest first';
	if (state.type === 'metric') {
		const label = metricColumns.find((column) => column.key === state.key)?.label ?? state.key;
		return `${label}, ${state.direction === 'desc' ? 'highest' : 'lowest'} first`;
	}
	return `${PRIMARY_LABELS[state.type]}, ${state.direction === 'asc' ? 'A to Z' : 'Z to A'}`;
}

export function sortId(state: SortState): string {
	return state.type === 'metric'
		? `metric:${state.key}:${state.direction}`
		: `${state.type}:${state.direction}`;
}

/** The orders offered on phones, where there are no column headers to tap. */
export const SORT_PRESETS: { label: string; state: SortState }[] = [
	{ label: 'Newest first', state: DEFAULT_SORT },
	{ label: 'Oldest first', state: { type: 'date', direction: 'asc' } },
	{ label: 'Paddock, A to Z', state: { type: 'paddock', direction: 'asc' } },
	{ label: 'Sample name, A to Z', state: { type: 'sample', direction: 'asc' } }
];
