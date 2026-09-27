import type { SoilTest } from './schema';

export type Filters = { q: string; paddock: number | null; year: number | null; page: number };
export type PageSlice<T> = {
	items: T[];
	page: number;
	pageCount: number;
	total: number;
	start: number;
	end: number;
};

export const PAGE_SIZE = 25;
export const EMPTY_FILTERS: Filters = { q: '', paddock: null, year: null, page: 1 };

export function yearOf(test: Pick<SoilTest, 'sampleDate'>): number | null {
	const match = /^(\d{4})-/.exec(test.sampleDate ?? '');
	return match ? Number(match[1]) : null;
}

export function filterTests(
	tests: readonly SoilTest[],
	{ q, paddock, year }: Pick<Filters, 'q' | 'paddock' | 'year'>
): SoilTest[] {
	const term = q.trim().toLowerCase();
	return tests.filter((test) => {
		if (paddock !== null && test.fieldId !== paddock) return false;
		if (year !== null && yearOf(test) !== year) return false;
		if (term === '') return true;
		const haystack =
			`${test.paddockName} ${test.fieldId} ${test.sampleName ?? ''} ${test.sampleId} ${test.farm ?? ''}`.toLowerCase();
		return haystack.includes(term);
	});
}

export function paginate<T>(list: readonly T[], page: number, pageSize = PAGE_SIZE): PageSlice<T> {
	const total = list.length;
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
	const startIndex = (current - 1) * pageSize;
	const items = list.slice(startIndex, startIndex + pageSize);
	return {
		items,
		page: current,
		pageCount,
		total,
		start: total === 0 ? 0 : startIndex + 1,
		end: startIndex + items.length
	};
}

/** Page numbers to show: first, last, and the current page's neighbours; null marks a gap. */
export function pageList(page: number, pageCount: number): (number | null)[] {
	const wanted = [...new Set([1, page - 1, page, page + 1, pageCount])]
		.filter((n) => n >= 1 && n <= pageCount)
		.sort((a, b) => a - b);
	const out: (number | null)[] = [];
	wanted.forEach((n, index) => {
		if (index > 0 && n - wanted[index - 1] > 1) out.push(null);
		out.push(n);
	});
	return out;
}

export function yearsIn(tests: readonly SoilTest[]): number[] {
	const years = new Set<number>();
	for (const test of tests) {
		const year = yearOf(test);
		if (year !== null) years.add(year);
	}
	return [...years].sort((a, b) => b - a);
}

const positiveInt = (value: string | null) =>
	value !== null && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;

export function parseFilters(url: URL): Filters {
	const params = url.searchParams;
	return {
		q: params.get('q') ?? '',
		paddock: positiveInt(params.get('paddock')),
		year: positiveInt(params.get('year')),
		page: positiveInt(params.get('page')) ?? 1
	};
}

export function filtersToSearch(filters: Filters): string {
	const params = new URLSearchParams();
	if (filters.q.trim() !== '') params.set('q', filters.q);
	if (filters.paddock !== null) params.set('paddock', String(filters.paddock));
	if (filters.year !== null) params.set('year', String(filters.year));
	if (filters.page > 1) params.set('page', String(filters.page));
	const search = params.toString();
	return search ? `?${search}` : '';
}
