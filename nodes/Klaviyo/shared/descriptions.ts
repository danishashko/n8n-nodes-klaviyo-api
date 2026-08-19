import type { INodeProperties } from 'n8n-workflow';

/**
 * Every Klaviyo collection answers `{ "data": [...], "links": { "next": <url|null> } }`
 * and every single-resource endpoint answers `{ "data": {...} }`, so the useful
 * payload always sits one level down.
 */
export const rootDataProperty = {
	output: {
		postReceive: [
			{
				type: 'rootProperty' as const,
				properties: { property: 'data' },
			},
		],
	},
};

/**
 * `links.next` is a fully-formed URL carrying the opaque cursor, so following it
 * verbatim is both simpler and safer than rebuilding the query string.
 */
export const cursorPagination = {
	operations: {
		pagination: {
			type: 'generic' as const,
			properties: {
				continue: '={{ !!$response.body?.links?.next }}',
				request: {
					url: '={{ $response.body.links.next }}',
					qs: {},
				},
			},
		},
	},
};

export function returnAllFields(resource: string, operation: string): INodeProperties[] {
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
				send: {
					paginate: '={{ $value }}',
					type: 'query',
					property: 'page[size]',
					value: '100',
				},
				...cursorPagination,
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			displayOptions: { show: { ...showOnly, returnAll: [false] } },
			description: 'Max number of results to return',
			routing: {
				send: {
					type: 'query',
					property: 'page[size]',
					// Klaviyo caps page[size] at 100, so a larger limit needs paging too.
					value: '={{ Math.min($value, 100) }}',
					paginate: '={{ $value > 100 }}',
				},
				output: { maxResults: '={{ $value }}' },
				...cursorPagination,
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
