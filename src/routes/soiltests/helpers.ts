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
	fieldId: string;
	paddockName: string;
	farm?: string;
	sampleId?: string | null;
	sampleName?: string | null;
	sampleDate?: string | null;
	client?: string | null;
	metrics: Partial<Record<MetricKey, number>>;
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
	return value ? String(value) : '';
}

export async function fetchSoilTests(): Promise<SoilTest[]> {
	const [testsRes, paddocksRes] = await Promise.all([
		fetch(CONFIG.backend.tests),
		fetch(CONFIG.backend.farm)
	]);

	if (!testsRes.ok) throw new Error(`Tests request failed (${testsRes.status})`);
	if (!paddocksRes.ok) throw new Error(`Paddock lookup failed (${paddocksRes.status})`);

	const [testsJson, paddocksJson] = await Promise.all([testsRes.json(), paddocksRes.json()]);

	const paddockLookup = new Map<string, { name: string; farm?: string }>();
	for (const feature of paddocksJson?.features ?? []) {
		const props = feature?.properties ?? {};
		const id = normalisePaddockId(props.fieldID ?? props.ADSFLDID ?? props.FIELDID ?? props.id);
		if (!id) continue;
		const name = String(props.fieldName ?? props.FIELDNAME ?? 'Unnamed paddock');
		const farm = props.FARM ? String(props.FARM) : undefined;
		paddockLookup.set(id, { name, farm });
	}

	return (testsJson ?? [])
		.map((row: any) => {
			const fieldId = normalisePaddockId(row.fieldID);
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

			return {
				id: Number(row.id ?? 0),
				fieldId,
				paddockName: paddock?.name ?? 'Unknown paddock',
				farm: paddock?.farm ?? (row.farm ? String(row.farm) : undefined),
				sampleId: row.id_sample ?? null,
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
}
