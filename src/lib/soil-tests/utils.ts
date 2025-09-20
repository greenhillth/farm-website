import CONFIG from '$lib/config';

import type {
	FetchSoilTestsResult,
	MetricKey,
	PaddockSummary,
	RawSoilTestRow,
	SoilTest
} from './schema';

const numberFormat = new Intl.NumberFormat('en-AU', {
	maximumFractionDigits: 2
});

const EXCEL_SERIAL_EPOCH = Date.UTC(1899, 11, 30);

export const toNumber = (value: unknown) => {
	const num = Number(value);
	return Number.isFinite(num) ? num : undefined;
};

export const toInteger = (value: unknown) => {
	const num = Number(value);
	return Number.isInteger(num) ? num : undefined;
};

export function formatNumber(value: number | undefined) {
	return value === undefined ? '-' : numberFormat.format(value);
}

export function formatDate(value: string | null | undefined) {
	if (!value) return '-';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-AU', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function normalisePaddockId(value: unknown) {
	return toInteger(value);
}

function fromExcelSerial(serial: number): string | null {
	if (!Number.isFinite(serial)) return null;
	const wholeDays = Math.floor(serial);
	if (wholeDays <= 0) return null;
	const adjustedDays = wholeDays >= 60 ? wholeDays - 1 : wholeDays;
	const milliseconds = EXCEL_SERIAL_EPOCH + adjustedDays * 86_400_000;
	const date = new Date(milliseconds);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString().slice(0, 10);
}

export function normaliseSampleDateValue(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
	}
	if (typeof value === 'number') {
		return fromExcelSerial(value);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
			const asNumber = Number(trimmed);
			const excelIso = fromExcelSerial(asNumber);
			if (excelIso) return excelIso;
		}
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString().slice(0, 10);
		}
		return trimmed;
	}
	return null;
}

export async function fetchSoilTests(): Promise<FetchSoilTestsResult> {
	const [testsRes, paddocksRes] = await Promise.all([
		fetch(CONFIG.backend.tests),
		fetch(CONFIG.backend.farm)
	]);

	if (!testsRes.ok) throw new Error(`Tests request failed (${testsRes.status})`);
	if (!paddocksRes.ok) throw new Error(`Paddock lookup failed (${paddocksRes.status})`);

	const [testsJson, paddocksJson] = await Promise.all([testsRes.json(), paddocksRes.json()]);

	const paddockLookup = new Map<number, { name: string; farm?: string }>();
	for (const feature of paddocksJson?.features ?? []) {
		const props = feature?.properties ?? {};
		const id = normalisePaddockId(
			props.fieldID ?? props.ADSFLDID ?? props.FIELDID ?? props.id
		);
		if (id === undefined) continue;
		const name = String(props.fieldName ?? props.FIELDNAME ?? 'Unnamed paddock');
		const farm = props.FARM ? String(props.FARM) : undefined;
		paddockLookup.set(id, { name, farm });
	}

	const tests = (testsJson ?? [])
		.map((row: RawSoilTestRow) => {
			const fieldId = normalisePaddockId(row.fieldID);
			if (fieldId === undefined) {
				throw new Error('Received soil test without a valid integer field ID');
			}
			const paddock = paddockLookup.get(fieldId);
			const sampleDate = normaliseSampleDateValue(row.sample_date);
			const metrics: SoilTest['metrics'] = {
				P: toNumber(row.P ?? row.p),
				K: toNumber(row.K ?? row.k),
				Ca: toNumber(row.Ca ?? row.CA),
				Mg: toNumber(row.Mg ?? row.MG),
				S: toNumber(row.S ?? row.s),
				Na: toNumber(row.Na ?? row.NA ?? row.sodium),
				ph_water: toNumber(row.ph_water ?? row.pH ?? row.PH)
			};

			const sampleId = toInteger(row.id_sample);
			if (sampleId === undefined) {
				throw new Error('Received soil test without a valid integer sample ID');
			}

			return {
				id: Number(row.id ?? 0),
				fieldId,
				paddockName: paddock?.name ?? 'Unknown paddock',
				farm: paddock?.farm ?? (row.farm ? String(row.farm) : undefined),
				sampleId,
				sampleName: row.name_sample ?? null,
				sampleDate,
				client: row.client ?? null,
				metrics
			} satisfies SoilTest;
		})
		.sort((a: SoilTest, b: SoilTest) => {
			const aDate = a.sampleDate ? new Date(a.sampleDate).getTime() : 0;
			const bDate = b.sampleDate ? new Date(b.sampleDate).getTime() : 0;
			return bDate - aDate;
		});

	for (const test of tests) {
		if (!paddockLookup.has(test.fieldId)) {
			paddockLookup.set(test.fieldId, {
				name: test.paddockName,
				farm: test.farm ?? undefined
			});
		}
	}

	const paddocks: PaddockSummary[] = Array.from(paddockLookup.entries())
		.map(([id, details]) => ({ id, name: details.name, farm: details.farm }))
		.sort((a, b) => a.id - b.id);

	return { tests, paddocks };
}
