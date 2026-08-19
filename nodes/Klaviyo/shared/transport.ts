import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { KLAVIYO_API_REVISION, KLAVIYO_BASE_URL } from './constants';

/**
 * Used by the trigger node and by the dropdowns, both of which run outside the
 * declarative routing layer and so have to build their own requests.
 */
export async function klaviyoApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		method,
		url: `${KLAVIYO_BASE_URL}${endpoint}`,
		qs,
		body,
		headers: {
			revision: KLAVIYO_API_REVISION,
			accept: 'application/vnd.api+json',
			...(body ? { 'content-type': 'application/vnd.api+json' } : {}),
		},
		json: true,
	};

	if (!body) delete options.body;

	return await this.helpers.httpRequestWithAuthentication.call(this, 'klaviyoApi', options);
}
