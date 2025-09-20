export const CSV_PROGRESS_EVENT_NAME = 'farm:csv-import-progress';

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

export const csvStageDefaults: Record<CsvProgressStage, { label: string; percent: number }> = {
	idle: { label: 'Waiting to upload CSV', percent: 0 },
	uploading: { label: 'Uploading CSV file…', percent: 10 },
	queued: { label: 'Queued for processing…', percent: 25 },
	parsing: { label: 'Parsing CSV data…', percent: 50 },
	importing: { label: 'Importing soil tests…', percent: 75 },
	complete: { label: 'Import complete', percent: 100 },
	error: { label: 'Import failed', percent: 100 }
};
