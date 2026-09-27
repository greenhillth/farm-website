<script lang="ts">
	import { formatOwners, type TitleFeatureProperties } from '$lib/layers';

	type Props = { title: TitleFeatureProperties };

	let { title }: Props = $props();

	const listUrl = $derived(
		`https://www.thelist.tas.gov.au/app/content/property/property-search?propertySearchCriteria.volume=&propertySearchCriteria.folio=&propertySearchCriteria.dealingNo=&propertySearchCriteria.surname=&propertySearchCriteria.givenName=&propertySearchCriteria.companyName=&propertySearchCriteria.propertyId=${encodeURIComponent(String(title.pid))}&addressString=&propertySearchCriteria.propertyName=&streetNumber=&propertySearchCriteria.streetName=`
	);
</script>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
	<dt class="text-muted">Title reference</dt>
	<dd>{title.titleRef || '-'}</dd>
	<dt class="text-muted">PID</dt>
	<dd>{title.pid ?? '-'}</dd>
	<dt class="text-muted">Owners</dt>
	<dd>{formatOwners(title.owners)}</dd>
	<dt class="text-muted">Ownership</dt>
	<dd>{title.ownershipPct || '-'}</dd>
	<dt class="text-muted">Volume and folio</dt>
	<dd>{title.volume || '-'} / {title.folio ?? '-'}</dd>
</dl>

{#if title.pid}
	<a
		href={listUrl}
		target="_blank"
		rel="external noopener noreferrer"
		class="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline-offset-4 hover:underline"
	>
		View on the LIST
		<span class="sr-only">(opens in a new tab)</span>
	</a>
{/if}
