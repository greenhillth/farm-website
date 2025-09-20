import CONFIG from '$lib/config';

export const metricColumns = [
	{ key: 'P', label: 'P' },
	{ key: 'K', label: 'K' },
	{ key: 'Ca', label: 'Ca' },
	{ key: 'Mg', label: 'Mg' },
	{ key: 'S', label: 'S' },
	{ key: 'Na', label: 'Na' },
	{ key: 'pH', label: 'pH (H2O)' }
] as const;

export type MetricKey = (typeof metricColumns)[number]['key'];

export type SoilTest = {
	id: number;
	fieldId: number;
	paddockName: string;
	farm?: string;
	sampleId: number;
	sampleName?: string | null;
	sampleDate?: string | null;
	client?: string | null;
	metrics: Partial<Record<MetricKey, number>>;
};


export type RawSoilTestRow = {
	id?: number | string | null;
	fieldID?: number | string | null;
	P?: number | string | null;
	p?: number | string | null;
	K?: number | string | null;
	k?: number | string | null;
	Ca?: number | string | null;
	CA?: number | string | null;
	Mg?: number | string | null;
	MG?: number | string | null;
	S?: number | string | null;
	s?: number | string | null;
	Na?: number | string | null;
	NA?: number | string | null;
	sodium?: number | string | null;
	ph_water?: number | string | null;
	pH?: number | string | null;
	PH?: number | string | null;
	farm?: string | number | null;
	id_sample?: number | string | null;
	name_sample?: string | null;
	sample_date?: string | null;
	client?: string | null;
};


export type PaddockSummary = {
	id: number;
	name: string;
	farm?: string;
};

export type FetchSoilTestsResult = {
	tests: SoilTest[];
	paddocks: PaddockSummary[];
};

export type BulkDeleteResponse = {
	deleted?: number;
	ids?: SoilTest['id'][];
	failedIds?: SoilTest['id'][];
};

export type CsvProgressStage =
	| 'idle'
	| 'uploading'
	| 'queued'
	| 'parsing'
	| 'importing'
	| 'complete'
	| 'error';

export type CsvProgressState = {
	visible: boolean;
	stage: CsvProgressStage;
	percent: number;
	message: string;
	detail?: string | null;
};

export type CsvProgressUpdate = {
	jobId?: string;
	stage: CsvProgressStage;
	percent?: number;
	message?: string;
	detail?: string | null;
};

export const CSV_PROGRESS_EVENT_NAME = 'farm:csv-import-progress';

export const csvStageDefaults: Record<CsvProgressStage, { label: string; percent: number }> = {
	idle: { label: 'Waiting to upload CSV', percent: 0 },
	uploading: { label: 'Uploading CSV file…', percent: 10 },
	queued: { label: 'Queued for processing…', percent: 25 },
	parsing: { label: 'Parsing CSV data…', percent: 50 },
	importing: { label: 'Importing soil tests…', percent: 75 },
	complete: { label: 'Import complete', percent: 100 },
	error: { label: 'Import failed', percent: 100 }
};

export const metricPlaceholders: Record<MetricKey, string> = {
	P: 'e.g. 56.7',
	K: 'e.g. 562.8',
	Ca: 'e.g. 2595.7',
	Mg: 'e.g. 305',
	S: 'e.g. 26.3',
	Na: 'e.g. 98.5',
	pH: 'e.g. 5.9'
};

const numberFormat = new Intl.NumberFormat('en-AU', {
	maximumFractionDigits: 2
});

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
			const metrics: SoilTest['metrics'] = {
				P: toNumber(row.P ?? row.p),
				K: toNumber(row.K ?? row.k),
				Ca: toNumber(row.Ca ?? row.CA),
				Mg: toNumber(row.Mg ?? row.MG),
				S: toNumber(row.S ?? row.s),
				Na: toNumber(row.Na ?? row.NA ?? row.sodium),
				pH: toNumber(row.ph_water ?? row.pH ?? row.PH)
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
				sampleDate: row.sample_date ?? null,
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
