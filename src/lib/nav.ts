import type { Pathname } from '$app/types';

export type NavIconName =
	'home' | 'map' | 'weather' | 'soil' | 'paddocks' | 'help' | 'more' | 'external';

export type NavItem = { href: Pathname; label: string; icon: NavIconName };
export type ExternalLink = { href: string; label: string };

export const primaryNav: NavItem[] = [
	{ href: '/', label: 'Home', icon: 'home' },
	{ href: '/map', label: 'Map', icon: 'map' },
	{ href: '/weather', label: 'Weather', icon: 'weather' },
	{ href: '/soiltests', label: 'Soil tests', icon: 'soil' }
];

export const secondaryNav: NavItem[] = [
	{ href: '/paddocks', label: 'Paddocks', icon: 'paddocks' },
	{ href: '/manual', label: 'Help', icon: 'help' }
];

export const externalLinks: ExternalLink[] = [
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/SitePages/CollabHome.aspx',
		label: 'SharePoint home'
	},
	{
		href: 'https://greenhillbros.sharepoint.com/sites/Draft/Shared%20Documents/Forms/AllItems.aspx',
		label: 'SharePoint invoices'
	}
];

/** Home is active only on `/`; any other item is active on its path and the pages below it. */
export function isActive(item: { href: string }, pathname: string): boolean {
	if (item.href === '/') return pathname === '/';
	return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
