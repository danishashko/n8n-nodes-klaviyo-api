import type { IDataObject, IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * An event carries two nested resource objects of its own - the metric it belongs
 * to and the profile it happened to - so the body is assembled here rather than
 * through field-level routing.
 */
export async function presendEvent(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const metricName = (this.getNodeParameter('metricName', '') as string)?.trim();
	const email = (this.getNodeParameter('email', '') as string)?.trim();
	const phoneNumber = (this.getNodeParameter('phoneNumber', '') as string)?.trim();
	const options = this.getNodeParameter('options', {}) as IDataObject;
	const rawProperties = this.getNodeParameter('eventProperties', {}) as {
		property?: Array<{ name: string; value: string }>;
	};

	if (!email && !phoneNumber) {
		throw new NodeOperationError(
			this.getNode(),
			'Either "Email" or "Phone Number" is needed to identify the profile',
			{
				description:
					'Klaviyo attaches every event to a profile, and looks that profile up by email address or phone number.',
				itemIndex: this.getItemIndex(),
			},
		);
	}

	const profileAttributes: IDataObject = {};
	if (email) profileAttributes.email = email;
	if (phoneNumber) profileAttributes.phone_number = phoneNumber;

	const properties: IDataObject = {};
	for (const entry of rawProperties.property ?? []) {
		if (entry?.name) properties[entry.name] = entry.value;
	}

	const attributes: IDataObject = {
		// Klaviyo rejects an event with no properties object, even an empty one.
		properties,
		metric: { data: { type: 'metric', attributes: { name: metricName } } },
		profile: { data: { type: 'profile', attributes: profileAttributes } },
	};

	if (options.value !== undefined && options.value !== '') attributes.value = options.value;
	if (options.valueCurrency) attributes.value_currency = options.valueCurrency;
	if (options.time) attributes.time = options.time;
	if (options.uniqueId) attributes.unique_id = options.uniqueId;

	requestOptions.body = {
		data: { type: 'event', attributes },
	} as IDataObject;

	return requestOptions;
}
