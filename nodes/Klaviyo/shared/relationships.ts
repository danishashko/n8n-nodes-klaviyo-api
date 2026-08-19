import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Relationship endpoints take a bare array of resource identifiers rather than the
 * usual `{ data: { type, attributes } }` envelope, and the DELETE variant carries a
 * body - which field-level routing has no way to attach to a DELETE.
 */
export async function presendProfileRelationship(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const raw = this.getNodeParameter('profileIds', '') as string;
	const ids = raw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	if (!ids.length) {
		throw new NodeOperationError(this.getNode(), 'No profile IDs were given', {
			description:
				'Fill in "Profile IDs" with one or more Klaviyo profile IDs, separated by commas.',
			itemIndex: this.getItemIndex(),
		});
	}

	requestOptions.body = {
		data: ids.map((id) => ({ type: 'profile', id })),
	} as IDataObject;

	return requestOptions;
}

/**
 * Klaviyo answers these with 204 and no body. n8n treats a node that returns zero
 * items as the end of the branch, so a confirmation item is emitted instead - which
 * is also what n8n's own UX guidelines ask for on delete operations.
 */
export async function deletedConfirmation(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length && items.some((item) => Object.keys(item.json ?? {}).length)) {
		return items;
	}

	return [{ json: { success: response.statusCode < 300, status: response.statusCode } }];
}
