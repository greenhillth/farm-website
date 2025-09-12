import { json, type RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';

interface PaddockRow {
	id: string;
	name: string;
	farm: string | null;
	year: string | null;
	OM: number | null;
	P1: number | null;
	K: number | null;
	MG: number | null;
	CA: number | null;
	PH: number | null;
	geometry: string | null;
}

// GET /api/data/farm -> GeoJSON FeatureCollection of paddocks
export const GET: RequestHandler = () => {
	const rows = db
		.prepare('SELECT id, name, farm, year, OM, P1, K, MG, CA, PH, geometry FROM paddock')
		.all() as PaddockRow[];

	const features = rows.map((r) => ({
		type: 'Feature',
		geometry: r.geometry ? JSON.parse(r.geometry) : null,
		properties: {
			fieldID: r.id,
			fieldName: r.name,
			FARM: r.farm,
			ADSYEAR: r.year,
			OM: r.OM,
			P1: r.P1,
			K: r.K,
			MG: r.MG,
			CA: r.CA,
			PH: r.PH
		}
	}));

	return json({
		type: 'FeatureCollection',
		features
	});
};
