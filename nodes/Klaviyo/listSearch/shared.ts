import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { klaviyoApiRequest } from '../shared/transport';

type KlaviyoResource = {
	id: string;
	attributes: { name?: string; [key: string]: unknown };
};

type KlaviyoCollection = {
	data?: KlaviyoResource[];
	links?: { next?: string | null };
};

/**
 * Klaviyo paginates with an opaque cursor carried on `links.next`, and none of the
 * collections used for these dropdowns support a "name contains" filter server
 * side, so the typed filter is applied here instead.
 */
export async function searchCollection(
	this: ILoadOptionsFunctions,
	endpoint: string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs: Record<string, string> = {};
	if (paginationToken) qs['page[cursor]'] = paginationToken;

	const response = (await klaviyoApiRequest.call(
		this,
		'GET',
		endpoint,
		undefined,
		qs,
	)) as KlaviyoCollection;

	const results = (response.data ?? [])
		.map((item) => ({
			name: (item.attributes?.name as string) || item.id,
			value: item.id,
		}))
		.filter((item) =>
			filter ? item.name.toLowerCase().includes(filter.toLowerCase()) : true,
		);

	// `links.next` is a full URL; the cursor inside it is what the next call needs.
	const next = response.links?.next;
	const nextCursor = next ? new URLSearchParams(next.split('?')[1] ?? '').get('page[cursor]') : null;

	return { results, paginationToken: nextCursor ?? undefined };
}
