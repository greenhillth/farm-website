export type HomeItem = {
	href: string;
	title: string;
	description?: string;
	tags?: string[];
	image?: string | null;
	imageAlt?: string;
	badge?: string | null;
};

export const homeItems: HomeItem[] = [
	{
		href: '/map',
		title: 'Interactive Farm Map',
		description: 'Explore fields, soil metrics and optimal ranges.',
		tags: ['map', 'leaflet'],
		image: '/img/map-card.webp',
		imageAlt: 'Aerial view of farm map',
		badge: 'Featured'
	},
	{
		href: '/paddocks',
		title: 'Paddock Manager',
		description: 'Manage paddocks, notes, and field tasks.',
		tags: ['paddocks'],
		image: '/img/paddock-card.webp',
		badge: 'New'
	},
	{
		href: '/soiltests',
		title: 'Soil Tests',
		description: 'Manage soil tests and analysis.',
		tags: ['soil', 'tests'],
		image: '/img/soil-card.webp',
		badge: 'New'
	},
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/Shared%20Documents/Forms/AllItems.aspx',
		title: 'Sharepoint Invoices',
		description: 'Sharepoint Invoices Site',
		tags: ['instructions', 'manual'],
		image: '/img/sharepoint.jpg',
		badge: 'Sharepoint'
	},
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/SitePages/CollabHome.aspx',
		title: 'Sharepoint Home',
		description: 'Greenhill Bros Sharepoint Home',
		tags: ['instructions', 'manual'],
		image: '/img/sharepoint.jpg',
		badge: 'Sharepoint'
	},
	{
		href: '/timesheet',
		title: 'Timesheets',
		description: 'Log hours and activities across the farm.',
		tags: ['timesheet'],
		image: null,
		badge: 'New'
	},
	{
		href: '/weather',
		title: 'Weather Station',
		description: 'Live outdoor/indoor, wind, rainfall, solar and more.',
		tags: ['weather'],
		image: '/img/weather-station.webp',
		badge: 'Dashboard'
	},
	// {
	//   href: '/alex',
	//   title: 'Media Lab',
	//   description: 'Video + image experiments for the site.',
	//   tags: ['media'],
	//   image: '/img/tom-and-alex.jpg',
	//   imageAlt: 'Tom and Alex'
	// },
	{
		href: '/map?metric=OM',
		title: 'Soil Organic Matter',
		description: 'Visualize OM across the farm.',
		tags: ['soil', 'OM'],
		image: null,
		badge: 'Analytics'
	},
	{
		href: '/manual',
		title: 'Operation Instructions',
		description: 'Instructions for the less technically-savvy.',
		tags: ['instructions', 'manual'],
		image: '/img/manual-card.webp',
		badge: 'Help'
	}
];
