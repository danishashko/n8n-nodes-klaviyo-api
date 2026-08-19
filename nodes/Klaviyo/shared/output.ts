import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';

/**
 * Pulls the JSON:API payload out of a Klaviyo response.
 *
 * Every collection answers `{ "data": [...], "links": {...} }` and every single
 * resource answers `{ "data": {...} }`, so the useful part always sits one level
 * down. The obvious way to say that is `postReceive: [{ type: 'rootProperty',
 * properties: { property: 'data' } }]`.
 *
 * That breaks the moment pagination is switched on. With `paginate` set, n8n
 * turns on `returnFullResponse` internally, so what reaches postReceive is
 * `{ body, headers, statusCode }` rather than the body - `data` is no longer at
 * the root, the extraction finds nothing, and the node emits an item with no
 * `json` on it at all. It fails silently: the node is green, the item count looks
 * plausible, and every field downstream is undefined. Caught on a live run where
 * "Get Many" segments with Return All enabled produced exactly one empty item.
 *
 * Unwrapping `body` when it is there handles both shapes.
 */
export async function extractData(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const payloads: IDataObject[] = items.length
		? items.map((item) => unwrap(item.json as IDataObject))
		: [unwrap(response?.body as IDataObject)];

	const results: INodeExecutionData[] = [];
	for (const payload of payloads) {
		const data = payload?.data;
		if (Array.isArray(data)) {
			results.push(...data.map((entry) => ({ json: entry as IDataObject })));
		} else if (data) {
			results.push({ json: data as IDataObject });
		}
	}

	// `output.maxResults` cannot do this. n8n applies it before postReceive runs, so
	// it trims the single unparsed response item - a no-op - and the expansion into
	// records happens afterwards. A Limit of 20 on Metrics returned 40 rows until the
	// trim moved here.
	const limit = getLimit.call(this);
	return limit === null ? results : results.slice(0, limit);
}

/**
 * Returns the JSON:API body, whatever wrapper it arrived in.
 *
 * A body can reach here as a string when the response was not JSON. Spreading a
 * string into an item turns it into an object keyed by character offset, which is
 * why a stray HTML page showed up as an item with 518,273 numeric keys instead of
 * a clean failure.
 */
function unwrap(value: IDataObject | string | undefined): IDataObject {
	if (!value) return {};

	const raw = typeof value === 'string' ? value : ((value.body ?? value) as IDataObject | string);
	if (typeof raw !== 'string') return raw ?? {};

	try {
		return JSON.parse(raw) as IDataObject;
	} catch {
		return {};
	}
}

/**
 * The active Limit, or null when it does not apply - Return All is on, or the
 * operation returns a single resource and has no Limit at all.
 */
function getLimit(this: IExecuteSingleFunctions): number | null {
	try {
		if (this.getNodeParameter('returnAll', false)) return null;
		const limit = this.getNodeParameter('limit', 0) as number;
		return limit > 0 ? limit : null;
	} catch {
		return null;
	}
}
