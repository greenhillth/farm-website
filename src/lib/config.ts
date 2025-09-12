const CONFIG = {
	data: {
		// Backend endpoints serving paddock and related data from the database
		geojson: '/api/data/farm',
		optima: '/api/data/optima',
		bounds: '/api/data/bounds'
	},
	tiles: {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS community',
		maxZoom: 20
	},
	metrics: ['OM', 'P1', 'K', 'MG', 'CA', 'PH'], // keep your list
	defaultMetric: 'OM',
	palette: ['#f7d200', '#b3e472', '#16a34a', '#89e472', '#b91c1c'],
	maxDevFactor: 1.5
};
export default CONFIG;
