const CONFIG = {
	data: {
		farm: '/api/data/farm',
		geojson: '/api/data/farm',
		tests: '/api/data/tests'
	},
	tiles: {
		url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
		attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS community',
		maxZoom: 20
	},
	soilMetrics: [
		{
			id: 'none',
			label: 'None',
			description: null
		},
		{
			id: 'OM',
			label: 'Organic Matter',
			description:
				'Indicates the amount of decomposed plant and animal residues in the soil. Higher levels improve soil structure, water retention, and nutrient availability.'
		},
		{
			id: 'P',
			label: 'Phosphorus',
			description:
				'Essential for root development, energy transfer, and early crop growth. Deficiency often limits yields in many soils.'
		},
		{
			id: 'K',
			label: 'Potassium',
			description:
				'Supports plant water regulation, disease resistance, and overall crop quality. Deficiency reduces drought tolerance and yield.'
		},
		{
			id: 'M',
			label: 'Magnesium',
			description:
				'A key part of chlorophyll, vital for photosynthesis. Low levels can cause yellowing between leaf veins and poor plant growth.'
		},
		{
			id: 'Ca',
			label: 'Calcium',
			description:
				'Important for cell wall strength, root development, and soil structure. Deficiency can lead to poor root growth and fruit quality issues.'
		},
		{
			id: 'pH',
			label: 'Soil pH',
			description:
				'Measures soil acidity or alkalinity, which strongly influences nutrient availability and microbial activity. Most crops prefer a slightly acidic to neutral range (pH 6-7).'
		}
	]
};
export default CONFIG;

export type MetricOption = (typeof CONFIG.soilMetrics)[number];
export type MetricId = MetricOption['id'];
