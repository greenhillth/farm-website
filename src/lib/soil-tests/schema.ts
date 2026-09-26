export const metricColumns = [
	{ key: 'P', label: 'P' },
	{ key: 'K', label: 'K' },
	{ key: 'Ca', label: 'Ca' },
	{ key: 'Mg', label: 'Mg' },
	{ key: 'S', label: 'S' },
	{ key: 'Na', label: 'Na' },
	{ key: 'ph_water', label: 'pH (H2O)' }
] as const;

export type MetricKey = (typeof metricColumns)[number]['key'];
export type MetricColumn = (typeof metricColumns)[number];

export const optionalColumns = [
	{ key: 'olsen_P', label: 'Olsen P' },
	{ key: 'Cl', label: 'Cl' },
	{ key: 'Cu', label: 'Cu' },
	{ key: 'Fe', label: 'Fe' },
	{ key: 'Mn', label: 'Mn' },
	{ key: 'Zn', label: 'Zn' },
	{ key: 'B', label: 'B' },
	{ key: 'Al', label: 'Al' },
	{ key: 'EC', label: 'EC' },
	{ key: 'ph_cacl2', label: 'pH (CaCl₂)' },
	{ key: 'buffer_pH', label: 'Buffer pH' },
	{ key: 'total_C', label: 'Total C' },
	{ key: 'total_N', label: 'Total N' },
	{ key: 'soil_depth_from', label: 'Depth from' },
	{ key: 'soil_depth_to', label: 'Depth to' }
] as const;

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

export type RawSoilTestRow = Record<string, unknown> & {
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
	id_sample?: number | string | null;
	name_sample?: string | null;
	sample_date?: string | number | null;
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

export const metricPlaceholders: Record<MetricKey, string> = {
	P: 'e.g. 56.7',
	K: 'e.g. 562.8',
	Ca: 'e.g. 2595.7',
	Mg: 'e.g. 305',
	S: 'e.g. 26.3',
	Na: 'e.g. 98.5',
	ph_water: 'e.g. 5.9'
};

export const CSV_REQUIRED_HEADERS = ['fieldID', 'id_sample', 'name_sample', 'sample_date'] as const;
