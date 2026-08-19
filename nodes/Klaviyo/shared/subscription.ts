import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

type Consent = 'SUBSCRIBED' | 'UNSUBSCRIBED';

/**
 * Klaviyo models consent as a bulk job: a list relationship, plus one profile
 * object per person carrying a channel tree of `{ marketing: { consent } }`.
 * That is three levels deeper than field-level routing can express, so the whole
 * body is assembled here instead.
 *
 * The same shape serves subscribe and unsubscribe; only the consent value and the
 * resource type differ.
 */
function buildSubscriptionBody(this: IExecuteSingleFunctions, consent: Consent): IDataObject {
	const email = (this.getNodeParameter('subscribeEmail', '') as string)?.trim();
	const phoneNumber = (this.getNodeParameter('subscribePhone', '') as string)?.trim();
	const channels = this.getNodeParameter('channels', []) as string[];
	const listId = this.getNodeParameter('subscribeListId', undefined, {
		extractValue: true,
	}) as string;

	if (!email && !phoneNumber) {
		throw new NodeOperationError(
			this.getNode(),
			'Either "Email" or "Phone Number" is needed to identify the profile',
			{
				description:
					'Klaviyo looks the profile up by email address or phone number. Fill in at least one of them.',
				itemIndex: this.getItemIndex(),
			},
		);
	}

	if (!channels.length) {
		throw new NodeOperationError(this.getNode(), 'At least one channel has to be selected', {
			description: 'Pick the channels the consent change applies to in the "Channels" field.',
			itemIndex: this.getItemIndex(),
		});
	}

	// SMS and WhatsApp consent is keyed to a phone number, email consent to an
	// address. Asking for SMS consent with no phone number reaches Klaviyo as a
	// silently empty change, so it is caught here.
	if ((channels.includes('sms') || channels.includes('whatsapp')) && !phoneNumber) {
		throw new NodeOperationError(this.getNode(), 'SMS and WhatsApp consent needs a phone number', {
			description:
				'Fill in "Phone Number" in E.164 format, for example +15005550006, or remove those channels.',
			itemIndex: this.getItemIndex(),
		});
	}

	if (channels.includes('email') && !email) {
		throw new NodeOperationError(this.getNode(), 'Email consent needs an email address', {
			description: 'Fill in "Email", or remove the Email channel.',
			itemIndex: this.getItemIndex(),
		});
	}

	const subscriptions: IDataObject = {};
	for (const channel of channels) {
		subscriptions[channel] = { marketing: { consent } };
	}

	const attributes: IDataObject = { subscriptions };
	if (email) attributes.email = email;
	if (phoneNumber) attributes.phone_number = phoneNumber;

	const subscribing = consent === 'SUBSCRIBED';
	const jobAttributes: IDataObject = {
		profiles: { data: [{ type: 'profile', attributes }] },
	};

	if (subscribing) {
		const customSource = (this.getNodeParameter('customSource', '') as string)?.trim();
		if (customSource) jobAttributes.custom_source = customSource;
	}

	return {
		data: {
			type: subscribing
				? 'profile-subscription-bulk-create-job'
				: 'profile-subscription-bulk-delete-job',
			attributes: jobAttributes,
			relationships: { list: { data: { type: 'list', id: listId } } },
		},
	};
}

export async function presendSubscribe(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = buildSubscriptionBody.call(this, 'SUBSCRIBED');
	return requestOptions;
}

export async function presendUnsubscribe(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = buildSubscriptionBody.call(this, 'UNSUBSCRIBED');
	return requestOptions;
}

/**
 * Klaviyo queues consent changes and answers 202 with an empty body. A node that
 * emits zero items ends the branch, so anything wired after a Subscribe would
 * silently never run. Emitting an explicit confirmation keeps the branch alive
 * and tells the user what actually happened.
 */
export async function acceptedJobResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length && items.some((item) => Object.keys(item.json ?? {}).length)) {
		return items;
	}

	return [{ json: { accepted: response.statusCode === 202, status: response.statusCode } }];
}
