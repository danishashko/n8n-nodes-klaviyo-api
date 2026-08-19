import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { searchCollection } from './shared';

export async function getMetrics(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchCollection.call(this, '/api/metrics', filter, paginationToken);
}
