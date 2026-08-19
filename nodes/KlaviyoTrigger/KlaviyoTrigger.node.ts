import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { klaviyoApiRequest } from '../Klaviyo/shared/transport';

type WebhookTopic = { id: string };

// `usableAsTool` is deliberately absent: a trigger has no input to be invoked
// with, and the property only accepts `true`, so leaving it out is the only way
// to say no.
export class KlaviyoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Klaviyo Trigger',
		name: 'klaviyoTrigger',
		icon: { light: 'file:../../icons/klaviyo.svg', dark: 'file:../../icons/klaviyo.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["topics"].join(", ")}}',
		description: 'Starts the workflow when a Klaviyo event fires',
		defaults: { name: 'Klaviyo Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'klaviyoApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Topic Names or IDs',
				name: 'topics',
				type: 'multiOptions',
				default: [],
				required: true,
				description:
					'The Klaviyo events to listen for. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: { loadOptionsMethod: 'getWebhookTopics' },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Webhook Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. Orders to n8n',
						description:
							'The name this webhook is given in Klaviyo. Defaults to the name of this workflow.',
					},
					{
						displayName: 'Secret Key',
						name: 'secretKey',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description:
							'Klaviyo signs every delivery with this key, and the trigger rejects anything that does not match. Any hard-to-guess string works. Leave empty and one is derived from the workflow and node IDs.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getWebhookTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await klaviyoApiRequest.call(this, 'GET', '/api/webhook-topics')) as {
					data?: WebhookTopic[];
				};

				return (response.data ?? []).map((topic) => ({
					// Topic IDs read as "event:klaviyo.opened_email"; the tail is the
					// human-facing half, so it becomes the label.
					name: topic.id
						.replace(/^event:klaviyo\./, '')
						.replace(/_/g, ' ')
						.replace(/^./, (char) => char.toUpperCase()),
					value: topic.id,
				}));
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) return false;

				try {
					await klaviyoApiRequest.call(this, 'GET', `/api/webhooks/${webhookData.webhookId}`);
					return true;
				} catch (error) {
					// Deleted in Klaviyo since the last activation - forget it and recreate.
					this.logger.debug('Klaviyo webhook is no longer registered, recreating it', {
						webhookId: webhookData.webhookId,
						error: (error as Error).message,
					});
					delete webhookData.webhookId;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const topics = this.getNodeParameter('topics') as string[];
				const options = this.getNodeParameter('options', {}) as IDataObject;

				if (!topics.length) {
					throw new NodeOperationError(this.getNode(), 'At least one topic has to be selected', {
						description: 'Pick the Klaviyo events this trigger should listen for.',
					});
				}

				if (!webhookUrl.startsWith('https://')) {
					throw new NodeOperationError(
						this.getNode(),
						'Klaviyo only delivers webhooks to an https URL',
						{
							description:
								'This n8n instance is reachable over http. Put it behind https, or use a tunnel, then activate the workflow again.',
						},
					);
				}

				const secretKey = resolveSecretKey.call(this, options.secretKey as string | undefined);

				const body = {
					data: {
						type: 'webhook',
						attributes: {
							name: (options.name as string) || this.getWorkflow().name || 'n8n',
							description: 'Created by n8n',
							endpoint_url: webhookUrl,
							secret_key: secretKey,
						},
						relationships: {
							'webhook-topics': {
								data: topics.map((id) => ({ type: 'webhook-topic', id })),
							},
						},
					},
				};

				const response = (await klaviyoApiRequest.call(this, 'POST', '/api/webhooks', body)) as {
					data?: { id?: string };
				};

				if (!response.data?.id) return false;

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.data.id;
				webhookData.secretKey = secretKey;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) return true;

				try {
					await klaviyoApiRequest.call(this, 'DELETE', `/api/webhooks/${webhookData.webhookId}`);
				} catch (error) {
					// Leave the stored ID in place: the webhook may still exist in Klaviyo,
					// and losing the ID here would orphan it with no way to clean it up.
					this.logger.error('Could not delete the Klaviyo webhook', {
						webhookId: webhookData.webhookId,
						error: (error as Error).message,
					});
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.secretKey;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const headers = this.getHeaderData() as IDataObject;
		const webhookData = this.getWorkflowStaticData('node');
		const secretKey = webhookData.secretKey as string | undefined;

		const signature = (headers['klaviyo-signature'] ?? headers['x-klaviyo-signature']) as
			| string
			| undefined;

		if (secretKey && signature) {
			// `request.rawBody` is what was signed. Comparing the parsed body would
			// re-serialise it and change the bytes, so the raw buffer is used.
			const raw = (request as unknown as { rawBody?: Buffer }).rawBody;
			const payload = raw ?? Buffer.from(JSON.stringify(this.getBodyData()));
			const expected = createHmac('sha256', secretKey).update(payload).digest('base64');

			if (!safeEqual(expected, signature)) {
				return {
					webhookResponse: { status: 401, body: 'Invalid signature' },
					noWebhookResponse: false,
				};
			}
		}

		return { workflowData: [this.helpers.returnJsonArray(this.getBodyData() as IDataObject)] };
	}
}

/**
 * Klaviyo requires a secret key when the webhook is registered. Asking every user
 * to invent one is friction for a value they never see again, so an unset key is
 * derived from identifiers that are already stable and unique to this node.
 */
function resolveSecretKey(this: IHookFunctions, provided?: string): string {
	if (provided?.trim()) return provided.trim();

	const workflowId = this.getWorkflow().id ?? 'workflow';
	const nodeId = this.getNode().id ?? this.getNode().name;
	return createHmac('sha256', String(workflowId)).update(String(nodeId)).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}
