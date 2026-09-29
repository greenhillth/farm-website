// Sample asset register for the map prototypes. The paddocks are real; every asset below is
// made up and placed by hand around the Woodcote paddocks, so positions, pole numbers, meter
// numbers and readings are examples only.
//
// The shape mirrors the backend model proposed in gbros-api docs/map-overhaul/README.md:
// a type registry (code-defined, one entry per kind of asset), assets that are GeoJSON-like
// features with typed properties, links between assets, and live datastreams.

// ─── Views ─────────────────────────────────────────────────────────────────
// A view is a task: it decides which asset types are drawn, how paddocks look underneath,
// which legend shows, and which facts the detail card leads with.
window.MAP_VIEWS = [
	{
		id: 'soil',
		label: 'Soil',
		glyph: 'paddock',
		blurb: 'Paddocks coloured by their latest soil test.',
		paddocks: 'metric',
		filters: []
	},
	{
		id: 'irrigation',
		label: 'Irrigation',
		glyph: 'pivot',
		blurb: 'Irrigators, dams, pumps and mains, with what is running now.',
		paddocks: 'context',
		filters: [
			{ id: 'irrigators', label: 'Irrigators' },
			{ id: 'supply', label: 'Water supply' }
		]
	},
	{
		id: 'infrastructure',
		label: 'Infrastructure',
		glyph: 'pole',
		blurb: 'Power, roads, gates and buildings.',
		paddocks: 'context',
		filters: [
			{ id: 'power', label: 'Power' },
			{ id: 'access', label: 'Roads and gates' },
			{ id: 'buildings', label: 'Buildings' }
		]
	},
	{
		id: 'property',
		label: 'Property',
		glyph: 'title',
		blurb: 'Paddock names and areas, and title boundaries.',
		paddocks: 'named',
		filters: []
	}
];

// ─── Type registry ─────────────────────────────────────────────────────────
// `views` maps a view to the filter chip the type sits under. A type can appear in more than
// one view: a pump is water supply in Irrigation and a power load in Infrastructure, and the
// detail card leads with flow in one and kilowatts in the other.
window.ASSET_TYPES = {
	utility_pole: {
		label: 'Utility pole',
		plural: 'Utility poles',
		geometry: 'Point',
		glyph: 'pole',
		views: { infrastructure: 'power' },
		minZoom: 16,
		fields: [
			{ key: 'pole_number', label: 'Pole number' },
			{ key: 'owner', label: 'Owner', options: ['Network', 'Farm'] },
			{ key: 'material', label: 'Material', options: ['Wood', 'Concrete', 'Steel'] },
			{ key: 'height_m', label: 'Height', unit: 'm' },
			{ key: 'equipment', label: 'Equipment on pole' }
		]
	},
	power_line: {
		label: 'Power line',
		plural: 'Power lines',
		geometry: 'LineString',
		glyph: 'power_line',
		views: { infrastructure: 'power' },
		fields: [
			{ key: 'voltage', label: 'Voltage', options: ['LV 415 V', 'HV 11 kV', 'HV 22 kV'] },
			{ key: 'construction', label: 'Construction', options: ['Overhead', 'Underground'] },
			{ key: 'owner', label: 'Owner', options: ['Network', 'Farm'] }
		]
	},
	electricity_meter: {
		label: 'Electricity meter',
		plural: 'Electricity meters',
		geometry: 'Point',
		glyph: 'elec_meter',
		views: { infrastructure: 'power' },
		fields: [
			{ key: 'nmi', label: 'NMI' },
			{ key: 'meter_number', label: 'Meter number' },
			{ key: 'tariff', label: 'Tariff' }
		],
		live: {
			infrastructure: [
				{ key: 'power_kw', label: 'Power now', unit: 'kW' },
				{ key: 'energy_today_kwh', label: 'Used today', unit: 'kWh' }
			]
		}
	},
	pump: {
		label: 'Pump',
		plural: 'Pumps',
		geometry: 'Point',
		glyph: 'pump',
		views: { irrigation: 'supply', infrastructure: 'power' },
		fields: [
			{ key: 'make_model', label: 'Make and model' },
			{ key: 'kind', label: 'Kind', options: ['Centrifugal', 'Submersible', 'Turbine'] },
			{ key: 'rated_kw', label: 'Motor', unit: 'kW' },
			{ key: 'max_flow_ls', label: 'Maximum flow', unit: 'L/s' },
			{ key: 'vsd', label: 'Variable speed drive', options: ['Yes', 'No'] }
		],
		live: {
			irrigation: [
				{ key: 'flow_ls', label: 'Flow', unit: 'L/s' },
				{ key: 'pressure_bar', label: 'Pressure', unit: 'bar' }
			],
			infrastructure: [
				{ key: 'power_kw', label: 'Power now', unit: 'kW' },
				{ key: 'hours_today', label: 'Run time today', unit: 'h' }
			]
		}
	},
	dam: {
		label: 'Dam',
		plural: 'Dams',
		geometry: 'Polygon',
		glyph: 'dam',
		views: { irrigation: 'supply' },
		fields: [
			{ key: 'capacity_ml', label: 'Capacity', unit: 'ML' },
			{ key: 'licence', label: 'Water licence' },
			{ key: 'fill_source', label: 'Filled from' }
		],
		live: {
			irrigation: [
				{ key: 'level_pct', label: 'Level', unit: '%' },
				{ key: 'volume_ml', label: 'Holding', unit: 'ML' }
			]
		}
	},
	water_main: {
		label: 'Water main',
		plural: 'Water mains',
		geometry: 'LineString',
		glyph: 'water_main',
		views: { irrigation: 'supply' },
		fields: [
			{ key: 'diameter_mm', label: 'Diameter', unit: 'mm' },
			{ key: 'material', label: 'Material', options: ['PVC', 'Poly', 'Steel'] },
			{ key: 'pressure_class', label: 'Pressure class' },
			{ key: 'buried', label: 'Buried', options: ['Yes', 'No'] }
		]
	},
	water_meter: {
		label: 'Water meter',
		plural: 'Water meters',
		geometry: 'Point',
		glyph: 'water_meter',
		views: { irrigation: 'supply' },
		fields: [
			{ key: 'serial', label: 'Serial number' },
			{ key: 'allocation_ml', label: 'Season allocation', unit: 'ML' }
		],
		live: {
			irrigation: [
				{ key: 'flow_ls', label: 'Flow', unit: 'L/s' },
				{ key: 'season_ml', label: 'Used this season', unit: 'ML' }
			]
		}
	},
	valve: {
		label: 'Valve or hydrant',
		plural: 'Valves and hydrants',
		geometry: 'Point',
		glyph: 'valve',
		views: { irrigation: 'supply' },
		minZoom: 16,
		fields: [
			{ key: 'kind', label: 'Kind', options: ['Gate valve', 'Butterfly valve', 'Hydrant'] },
			{ key: 'diameter_mm', label: 'Diameter', unit: 'mm' }
		]
	},
	centre_pivot: {
		label: 'Centre pivot',
		plural: 'Centre pivots',
		geometry: 'Point',
		geometryNote: 'The pivot point. The circle is drawn from radius_m and the arc.',
		glyph: 'pivot',
		views: { irrigation: 'irrigators' },
		fields: [
			{ key: 'make_model', label: 'Make and model' },
			{ key: 'spans', label: 'Spans' },
			{ key: 'radius_m', label: 'Radius', unit: 'm' },
			{ key: 'arc', label: 'Arc' },
			{ key: 'end_gun', label: 'End gun', options: ['Yes', 'No'] },
			{ key: 'controller', label: 'Live data from' }
		],
		live: {
			irrigation: [
				{ key: 'angle_deg', label: 'Position', unit: '°' },
				{ key: 'direction', label: 'Direction' },
				{ key: 'depth_mm', label: 'Applying', unit: 'mm' },
				{ key: 'finish', label: 'Pass ends' }
			]
		}
	},
	linear_move: {
		label: 'Linear move',
		plural: 'Linear moves',
		geometry: 'LineString',
		geometryNote: 'The machine where it was last seen. The run is a separate polygon.',
		glyph: 'linear',
		views: { irrigation: 'irrigators' },
		fields: [
			{ key: 'make_model', label: 'Make and model' },
			{ key: 'length_m', label: 'Length', unit: 'm' },
			{ key: 'feed', label: 'Fed by', options: ['Hose', 'Ditch'] },
			{ key: 'controller', label: 'Live data from' }
		],
		live: {
			irrigation: [
				{ key: 'direction', label: 'Travelling' },
				{ key: 'depth_mm', label: 'Applying', unit: 'mm' }
			]
		}
	},
	road: {
		label: 'Road or track',
		plural: 'Roads and tracks',
		geometry: 'LineString',
		glyph: 'road',
		views: { infrastructure: 'access' },
		fields: [
			{ key: 'surface', label: 'Surface', options: ['Sealed', 'Gravel', 'Dirt track'] },
			{ key: 'wet_weather', label: 'Wet weather', options: ['All weather', 'Dry only'] }
		]
	},
	gate: {
		label: 'Gate',
		plural: 'Gates',
		geometry: 'Point',
		glyph: 'gate',
		views: { infrastructure: 'access' },
		minZoom: 16,
		fields: [
			{ key: 'kind', label: 'Kind', options: ['Steel farm gate', 'Wire gate', 'Cattle grid'] },
			{ key: 'width_m', label: 'Width', unit: 'm' },
			{ key: 'between', label: 'Between' }
		]
	},
	building: {
		label: 'Building',
		plural: 'Buildings',
		geometry: 'Point',
		glyph: 'building',
		views: { infrastructure: 'buildings' },
		fields: [{ key: 'use', label: 'Used for' }]
	},
	weather_station: {
		label: 'Weather station',
		plural: 'Weather stations',
		geometry: 'Point',
		glyph: 'weather',
		views: { irrigation: 'supply', infrastructure: 'buildings' },
		fields: [{ key: 'make_model', label: 'Make and model' }],
		live: {
			irrigation: [
				{ key: 'rain_today_mm', label: 'Rain today', unit: 'mm' },
				{ key: 'et_mm', label: 'Evaporation today', unit: 'mm' }
			],
			infrastructure: [
				{ key: 'temp_c', label: 'Temperature', unit: '°C' },
				{ key: 'wind_kmh', label: 'Wind', unit: 'km/h' }
			]
		}
	}
};

// ─── Assets ────────────────────────────────────────────────────────────────
// Coordinates are GeoJSON order: [longitude, latitude].

function damRing(lon, lat, rx, ry) {
	// A lumpy ellipse, rx/ry in metres, so the dam doesn't look drawn with a compass.
	const wobble = [1, 0.93, 1.05, 0.9, 1.08, 0.97, 1.02, 0.88, 1.04, 0.95, 1.06, 0.92];
	const kx = 1 / 83_800;
	const ky = 1 / 111_200;
	const ring = wobble.map((w, i) => {
		const a = (i / wobble.length) * Math.PI * 2;
		return [lon + Math.cos(a) * rx * w * kx, lat + Math.sin(a) * ry * w * ky];
	});
	ring.push(ring[0]);
	return [ring];
}

const pt = (lon, lat) => ({ type: 'Point', coordinates: [lon, lat] });
const line = (...coords) => ({ type: 'LineString', coordinates: coords });

const poles = [
	['UP-1', 481201, 146.505, -41.1856, 'Transformer 100 kVA'],
	['UP-2', 481202, 146.5035, -41.1853, null],
	['UP-3', 481203, 146.502, -41.185, null],
	['UP-4', 481204, 146.5005, -41.1846, 'Service to pump meter'],
	['UP-5', 481205, 146.4989, -41.1829, null],
	['UP-6', 481206, 146.4986, -41.1807, null],
	['UP-7', 481207, 146.4984, -41.179, 'Service to Pivot 2'],
	['UP-8', 481208, 146.4966, -41.1827, null],
	['UP-9', 481209, 146.4946, -41.182, null],
	['UP-10', 481210, 146.494, -41.18, null],
	['UP-11', 481211, 146.4942, -41.1782, 'Service to machinery shed']
];

window.ASSETS = [
	// Water supply
	{
		id: 'D1',
		type: 'dam',
		name: 'Woodcote dam',
		geometry: { type: 'Polygon', coordinates: damRing(146.5004, -41.1842, 65, 42) },
		props: { capacity_ml: 48, licence: 'Sample licence 1234', fill_source: 'Catchment runoff' },
		live: { status: 'none', level_pct: 72, volume_ml: 34.6 }
	},
	{
		id: 'P1',
		type: 'pump',
		name: 'Dam pump',
		geometry: pt(146.4993, -41.1836),
		props: {
			make_model: 'Southern Cross 150×125-315',
			kind: 'Centrifugal',
			rated_kw: 55,
			max_flow_ls: 75,
			vsd: 'Yes'
		},
		live: { status: 'running', flow_ls: 58, pressure_bar: 6.3, power_kw: 41.2, hours_today: 9.4 }
	},
	{
		id: 'WM1',
		type: 'water_meter',
		name: 'Dam pump meter',
		geometry: pt(146.4988, -41.1826),
		props: { serial: 'WM-20931', allocation_ml: 300 },
		live: { status: 'running', flow_ls: 58, season_ml: 142.6 }
	},
	{
		id: 'M1',
		type: 'water_main',
		name: 'North main',
		geometry: line(
			[146.4993, -41.1836],
			[146.4988, -41.1826],
			[146.4985, -41.1822],
			[146.4983, -41.1805],
			[146.49824, -41.17859]
		),
		props: { diameter_mm: 250, material: 'PVC', pressure_class: 'PN12', buried: 'Yes' }
	},
	{
		id: 'M2',
		type: 'water_main',
		name: 'West main',
		geometry: line(
			[146.4985, -41.1822],
			[146.4935, -41.1823],
			[146.49, -41.1824],
			[146.48958, -41.18239],
			[146.4884, -41.1836],
			[146.48768, -41.18467]
		),
		props: { diameter_mm: 200, material: 'PVC', pressure_class: 'PN12', buried: 'Yes' }
	},
	{
		id: 'M3',
		type: 'water_main',
		name: 'South main',
		geometry: line([146.4993, -41.1836], [146.4984, -41.1852], [146.4972, -41.1866]),
		props: { diameter_mm: 150, material: 'Poly', pressure_class: 'PN10', buried: 'Yes' }
	},
	{
		id: 'V1',
		type: 'valve',
		name: 'West main valve',
		geometry: pt(146.4985, -41.1822),
		props: { kind: 'Butterfly valve', diameter_mm: 200 }
	},
	{
		id: 'H1',
		type: 'valve',
		name: 'Melbourne hydrant',
		geometry: pt(146.4972, -41.1866),
		props: { kind: 'Hydrant', diameter_mm: 150 }
	},

	// Irrigators
	{
		id: 'I1',
		type: 'centre_pivot',
		name: 'Pivot 2',
		geometry: pt(146.49824, -41.17859),
		props: {
			make_model: 'Valley 8000',
			spans: 7,
			radius_m: 380,
			arc: 'Full circle',
			end_gun: 'Yes',
			controller: 'Not linked yet'
		},
		live: {
			status: 'running',
			angle_deg: 128,
			start_deg: 20,
			direction: 'Forward',
			depth_mm: 12,
			finish: '9:40 pm'
		}
	},
	{
		id: 'I2',
		type: 'centre_pivot',
		name: 'Byron pivot',
		geometry: pt(146.48958, -41.18239),
		props: {
			make_model: 'Lindsay Zimmatic',
			spans: 6,
			radius_m: 300,
			arc: 'Full circle',
			end_gun: 'No',
			controller: 'Not linked yet'
		},
		live: { status: 'idle', angle_deg: 310, direction: 'Parked', depth_mm: null, finish: '–' }
	},
	{
		id: 'I3',
		type: 'centre_pivot',
		name: 'Windmill pivot',
		geometry: pt(146.48768, -41.18467),
		props: {
			make_model: 'Valley 8000',
			spans: 5,
			radius_m: 240,
			arc: '200° part circle',
			end_gun: 'No',
			controller: 'Not linked yet'
		},
		live: {
			status: 'fault',
			angle_deg: 75,
			start_deg: 350,
			direction: 'Stopped',
			depth_mm: 10,
			finish: '–',
			message: 'Stopped on low pressure at 2:02 pm'
		}
	},
	{
		id: 'I4',
		type: 'linear_move',
		name: 'Melbourne lateral',
		geometry: line([146.4962, -41.1904], [146.4962, -41.1871]),
		props: {
			make_model: 'Lindsay lateral',
			length_m: 370,
			feed: 'Hose',
			controller: 'Not linked yet'
		},
		live: { status: 'offline', direction: 'East', depth_mm: 15, lastSeen: '3 hours ago' }
	},

	// Power
	...poles.map(([id, number, lon, lat, equipment]) => ({
		id,
		type: 'utility_pole',
		name: `Pole ${number}`,
		geometry: pt(lon, lat),
		props: {
			pole_number: String(number),
			owner: 'Network',
			material: 'Wood',
			height_m: 11,
			equipment: equipment ?? 'None'
		}
	})),
	{
		id: 'PL1',
		type: 'power_line',
		name: 'Pump and pivot feeder',
		geometry: line(...poles.slice(0, 7).map((p) => [p[2], p[3]])),
		props: { voltage: 'LV 415 V', construction: 'Overhead', owner: 'Network' }
	},
	{
		id: 'PL2',
		type: 'power_line',
		name: 'Shed spur',
		geometry: line([146.4989, -41.1829], ...poles.slice(7).map((p) => [p[2], p[3]])),
		props: { voltage: 'LV 415 V', construction: 'Overhead', owner: 'Network' }
	},
	{
		id: 'E1',
		type: 'electricity_meter',
		name: 'Pump shed meter',
		geometry: pt(146.4999, -41.1839),
		props: {
			nmi: '8000 0000 00 (sample)',
			meter_number: 'EM-55120',
			tariff: 'Irrigation, time of use'
		},
		live: { status: 'running', power_kw: 41.9, energy_today_kwh: 312 }
	},
	{
		id: 'E2',
		type: 'electricity_meter',
		name: 'Machinery shed meter',
		geometry: pt(146.4952, -41.1764),
		props: { nmi: '8000 0000 01 (sample)', meter_number: 'EM-55121', tariff: 'General supply' },
		live: { status: 'running', power_kw: 2.1, energy_today_kwh: 18 }
	},

	// Access and buildings
	{
		id: 'R1',
		type: 'road',
		name: 'Woodcote lane',
		geometry: line(
			[146.5058, -41.1852],
			[146.501, -41.1846],
			[146.4952, -41.1837],
			[146.4936, -41.1824],
			[146.4935, -41.18],
			[146.4948, -41.1771]
		),
		props: { surface: 'Gravel', wet_weather: 'All weather' }
	},
	{
		id: 'G1',
		type: 'gate',
		name: 'Lane gate',
		geometry: pt(146.5052, -41.1851),
		props: { kind: 'Steel farm gate', width_m: 4.2, between: 'Road and Woodcote lane' }
	},
	{
		id: 'G2',
		type: 'gate',
		name: 'Pivot 2 south gate',
		geometry: pt(146.4953, -41.1834),
		props: { kind: 'Steel farm gate', width_m: 6, between: 'Woodcote lane and Pivot 2 SW' }
	},
	{
		id: 'G3',
		type: 'gate',
		name: 'Christolena gate',
		geometry: pt(146.4937, -41.1828),
		props: { kind: 'Wire gate', width_m: 5, between: 'Woodcote lane and Christolena' }
	},
	{
		id: 'B1',
		type: 'building',
		name: 'Machinery shed',
		geometry: pt(146.4929, -41.1759),
		props: { use: 'Machinery and workshop' }
	},
	{
		id: 'WS1',
		type: 'weather_station',
		name: 'Weather station',
		geometry: pt(146.4972, -41.1771),
		props: { make_model: 'EcoWitt (the real station, placed here as an example)' },
		live: { status: 'running', temp_c: 13.4, wind_kmh: 18, rain_today_mm: 0.4, et_mm: 2.9 }
	}
];

// ─── Links ─────────────────────────────────────────────────────────────────
// Directed: `from` feeds `to` (water or power), or `from` is mounted on / part of `to`.
window.ASSET_LINKS = [
	{ from: 'D1', to: 'P1', kind: 'feeds', medium: 'water' },
	{ from: 'P1', to: 'M1', kind: 'feeds', medium: 'water' },
	{ from: 'P1', to: 'M3', kind: 'feeds', medium: 'water' },
	{ from: 'WM1', to: 'M1', kind: 'mounted_on' },
	{ from: 'M1', to: 'V1', kind: 'feeds', medium: 'water' },
	{ from: 'V1', to: 'M2', kind: 'feeds', medium: 'water' },
	{ from: 'M1', to: 'I1', kind: 'feeds', medium: 'water' },
	{ from: 'M2', to: 'I2', kind: 'feeds', medium: 'water' },
	{ from: 'M2', to: 'I3', kind: 'feeds', medium: 'water' },
	{ from: 'M3', to: 'H1', kind: 'feeds', medium: 'water' },
	{ from: 'H1', to: 'I4', kind: 'feeds', medium: 'water' },
	...poles.slice(0, 7).map((p) => ({ from: p[0], to: 'PL1', kind: 'mounted_on' })),
	...poles.slice(7).map((p) => ({ from: p[0], to: 'PL2', kind: 'mounted_on' })),
	{ from: 'PL1', to: 'PL2', kind: 'feeds', medium: 'power' },
	{ from: 'PL1', to: 'E1', kind: 'feeds', medium: 'power' },
	{ from: 'E1', to: 'P1', kind: 'feeds', medium: 'power' },
	{ from: 'PL1', to: 'I1', kind: 'feeds', medium: 'power' },
	{ from: 'PL2', to: 'E2', kind: 'feeds', medium: 'power' },
	{ from: 'E2', to: 'B1', kind: 'feeds', medium: 'power' },
	{ from: 'G1', to: 'R1', kind: 'mounted_on' },
	{ from: 'G2', to: 'R1', kind: 'mounted_on' },
	{ from: 'G3', to: 'R1', kind: 'mounted_on' }
];
