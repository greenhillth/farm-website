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
			description: null,
			c_min: null,
			c_max: null
		},
		{
			id: 'OM',
			label: 'Organic Matter',
			description:
				'Indicates the amount of decomposed plant and animal residues in the soil. Higher levels improve soil structure, water retention, and nutrient availability.',
			unit: '%',
			range_optimal: [3.25, 5.2],
			c_min: 0,
			c_max: 7
		},
		{
			id: 'P',
			label: 'Phosphorus',
			description:
				'Essential for root development, energy transfer, and early crop growth. Deficiency often limits yields in many soils.',
			unit: 'mg/kg',
			range_optimal: [40, 90],
			c_min: 0,
			c_max: 250
		},
		{
			id: 'K',
			label: 'Potassium',
			description:
				'Supports plant water regulation, disease resistance, and overall crop quality. Deficiency reduces drought tolerance and yield.',
			unit: 'mg/kg',
			range_optimal: [245, 400],
			c_min: 0,
			c_max: 900
		},
		{
			id: 'M',
			label: 'Magnesium',
			description:
				'A key part of chlorophyll, vital for photosynthesis. Low levels can cause yellowing between leaf veins and poor plant growth.',
			unit: 'mg/kg',
			range_optimal: [220, 440],
			c_min: 0,
			c_max: 600
		},
		{
			id: 'Ca',
			label: 'Calcium',
			description:
				'Important for cell wall strength, root development, and soil structure. Deficiency can lead to poor root growth and fruit quality issues.',
			unit: 'mg/kg',
			range_optimal: [1950, 3450],
			c_min: 0,
			c_max: 5000
		},
		{
			id: 'pH',
			label: 'Soil pH',
			description:
				'Measures soil acidity or alkalinity, which strongly influences nutrient availability and microbial activity. Most crops prefer a slightly acidic to neutral range.',
			unit: null,
			range_optimal: [6, 7],
			c_min: 5,
			c_max: 8
		}
	]
};
export default CONFIG;

export type MetricOption = (typeof CONFIG.soilMetrics)[number];
export type MetricId = MetricOption['id'];
