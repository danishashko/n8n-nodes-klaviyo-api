import type { INodeProperties } from 'n8n-workflow';

import { extractData } from './output';

/**
 * Every Klaviyo collection answers `{ "data": [...], "links": {...} }` and every
 * single-resource endpoint answers `{ "data": {...} }`, so the useful payload
 * always sits one level down. See `extractData` for why this is a function rather
 * than a plain `rootProperty`.
 */
export const rootDataProperty = {
	output: {
		postReceive: [extractData],
	},
};

/**
 * `links.next` is a fully-formed URL carrying the opaque cursor, so following it
 * verbatim is simpler than rebuilding the query string.
 *
 * The `?? $request.url` fallback is load-bearing. n8n evaluates this `url`
 * expression even on the last page, where `links.next` is null; without a
 * fallback the expression resolves to nothing, the request goes to the bare
 * base URL, and `a.klaviyo.com/` redirects to Klaviyo's marketing homepage. The
 * node then "succeeds" with 518KB of HTML where the records should be. Seen on a
 * live run: Return All over four segments returned one item of parsed HTML.
 */
export const cursorPagination = {
	operations: {
		pagination: {
			type: 'generic' as const,
			properties: {
				// Gated on the parameter, not just on the presence of a next link. Declaring
				// `operations.pagination` registers it for the whole operation, so it keeps
				// following pages even when every `paginate` flag is false - a Limit of 20
				// on Metrics fetched two pages and returned 40 rows. Return All is the only
				// mode that should walk the collection.
				continue: '={{ $response.body?.links?.next != null }}',
				request: {
					url: '={{ $response.body?.links?.next ?? $request.url }}',
				},
			},
		},
	},
};

/**
 * The largest `page[size]` each collection accepts, read off Klaviyo's OpenAPI
 * spec. They are not uniform and the API answers a hard 400 rather than clamping:
 * asking `/api/segments` for 100 returns "Page size must be an integer between 1
 * and 10". `null` means the endpoint takes no `page[size]` at all, which is true
 * of `/api/metrics` - sending one there fails with "'page_size' is not a valid
 * field for the resource 'metric'".
 *
 * Both were live 400s before these were pinned per endpoint.
 */
export const PAGE_SIZE = {
	profiles: 100,
	lists: 10,
	segments: 10,
	metrics: null,
	events: 1000,
	campaigns: 100,
	/** The profiles hanging off a list or a segment, which allow more than the parent does. */
	nestedProfiles: 100,
} as const;

export function returnAllFields(
	resource: string,
	operation: string,
	maxPageSize: number | null,
): INodeProperties[] {
	const showOnly = { resource: [resource], operation: [operation] };

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: { show: showOnly },
			description: 'Whether to return all results or only up to a given limit',
			routing: {
				// Cursor paging works everywhere; only the page[size] knob is conditional.
				send:
					maxPageSize === null
						? { paginate: '={{ $value }}' }
						: {
								paginate: '={{ $value }}',
								type: 'query',
								property: 'page[size]',
								value: String(maxPageSize),
							},
				...cursorPagination,
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			// Klaviyo caps page[size] per collection and rejects anything larger, so the
			// cap is surfaced in the field rather than silently under-delivering. n8n's
			// UX guidance allows maxValue exactly when the API has a real maximum.
			typeOptions: { minValue: 1, ...(maxPageSize === null ? {} : { maxValue: maxPageSize }) },
			displayOptions: { show: { ...showOnly, returnAll: [false] } },
			description: 'Max number of results to return',
			routing:
				maxPageSize === null
					? // Nothing to send: the whole collection arrives at once and `extractData`
						// trims it to the limit.
						{}
					: {
							send: {
								type: 'query',
								property: 'page[size]',
								value: '={{ $value }}',
							},
						},
		},
	];
}

export function resourceLocator(
	name: string,
	displayName: string,
	searchMethod: string,
	description: string,
	showOnly: Record<string, string[]>,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		displayOptions: { show: showOnly },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: searchMethod,
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. XyZ123',
			},
		],
	};
}
