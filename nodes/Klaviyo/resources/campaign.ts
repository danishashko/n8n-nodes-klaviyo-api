import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, rootDataProperty } from '../shared/descriptions';
import { deletedConfirmation } from '../shared/relationships';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: { show: { resource: ['campaign'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a campaign',
				description: 'Delete a campaign permanently',
				routing: {
					request: { method: 'DELETE', url: '=/api/campaigns/{{ $parameter.campaignId }}' },
					output: { postReceive: [deletedConfirmation] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a campaign',
				description: 'Retrieve a single campaign by its ID',
				routing: {
					request: { method: 'GET', url: '=/api/campaigns/{{ $parameter.campaignId }}' },
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'Retrieve campaigns on a channel, with optional filtering by status',
				routing: {
					request: { method: 'GET', url: '/api/campaigns' },
					...rootDataProperty,
				},
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send a campaign',
				description: 'Send a campaign that is ready to go out',
				routing: {
					request: {
						method: 'POST',
						url: '/api/campaign-send-jobs',
						body: {
							data: {
								type: 'campaign-send-job',
								id: '={{ $parameter.campaignId }}',
							},
						},
					},
					...rootDataProperty,
				},
			},
		],
	},
];

export const campaignFields: INodeProperties[] = [
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 01GMRWDSA5Y7K2Y0X4S3F7VNRK',
		description: 'The Klaviyo ID of the campaign',
		displayOptions: { show: { resource: ['campaign'], operation: ['get', 'delete', 'send'] } },
	},
	{
		displayName: 'Channel',
		name: 'channel',
		type: 'options',
		default: 'email',
		required: true,
		// Klaviyo rejects GET /api/campaigns outright unless a messages.channel
		// filter is present, so this is a required field rather than an option.
		description: 'Which channel to list campaigns for. Klaviyo requires one to be chosen.',
		displayOptions: { show: { resource: ['campaign'], operation: ['getAll'] } },
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Mobile Push', value: 'mobile_push' },
			{ name: 'SMS', value: 'sms' },
		],
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: '',
		description: 'Return only campaigns in this status',
		displayOptions: { show: { resource: ['campaign'], operation: ['getAll'] } },
		options: [
			{ name: 'Any', value: '' },
			{ name: 'Cancelled', value: 'Cancelled' },
			{ name: 'Draft', value: 'Draft' },
			{ name: 'Queued Without Recipients', value: 'Queued without Recipients' },
			{ name: 'Scheduled', value: 'Scheduled' },
			{ name: 'Sending', value: 'Sending' },
			{ name: 'Sent', value: 'Sent' },
		],
	},
	{
		displayName: 'Filter',
		name: 'campaignFilter',
		type: 'hidden',
		default: '',
		displayOptions: { show: { resource: ['campaign'], operation: ['getAll'] } },
		routing: {
			send: {
				type: 'query',
				property: 'filter',
				value:
					'={{ "equals(messages.channel,\'" + $parameter.channel + "\')" + ($parameter.status ? ",equals(status,\'" + $parameter.status + "\')" : "") }}',
			},
		},
	},
	...returnAllFields('campaign', 'getAll'),
];
