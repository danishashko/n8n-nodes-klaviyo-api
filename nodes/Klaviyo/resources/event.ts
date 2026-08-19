import type { INodeProperties } from 'n8n-workflow';

import { returnAllFields, rootDataProperty } from '../shared/descriptions';
import { acceptedJobResponse } from '../shared/subscription';
import { presendEvent } from '../shared/event';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'create',
		displayOptions: { show: { resource: ['event'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an event',
				description: 'Track an event against a profile, which can start a flow',
				routing: {
					request: { method: 'POST', url: '/api/events' },
					send: { preSend: [presendEvent] },
					output: { postReceive: [acceptedJobResponse] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an event',
				description: 'Retrieve a single event by its ID',
				routing: {
					request: { method: 'GET', url: '=/api/events/{{ $parameter.eventId }}' },
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many events',
				description: 'Retrieve a list of events, with optional filtering',
				routing: {
					request: { method: 'GET', url: '/api/events' },
					...rootDataProperty,
				},
			},
		],
	},
];

export const eventFields: INodeProperties[] = [
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		required: true,
		description: 'The Klaviyo ID of the event',
		displayOptions: { show: { resource: ['event'], operation: ['get'] } },
	},
	{
		displayName: 'Metric Name',
		name: 'metricName',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Placed Order',
		description:
			'The name of the metric this event belongs to. Klaviyo creates the metric the first time it sees a new name.',
		displayOptions: { show: { resource: ['event'], operation: ['create'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'Email address of the profile the event belongs to',
		displayOptions: { show: { resource: ['event'], operation: ['create'] } },
	},
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		default: '',
		placeholder: 'e.g. +15005550006',
		description:
			'Phone number of the profile the event belongs to, in E.164 format. Used when there is no email address.',
		displayOptions: { show: { resource: ['event'], operation: ['create'] } },
	},
	{
		displayName: 'Event Properties',
		name: 'eventProperties',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Property',
		description: 'Details of the event, available inside Klaviyo flows and templates',
		displayOptions: { show: { resource: ['event'], operation: ['create'] } },
		options: [
			{
				displayName: 'Property',
				name: 'property',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. orderId',
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		displayOptions: { show: { resource: ['event'], operation: ['create'] } },
		options: [
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 0,
				description:
					'A monetary value for the event, used by Klaviyo to attribute revenue, for example the order total',
			},
			{
				displayName: 'Value Currency',
				name: 'valueCurrency',
				type: 'string',
				default: '',
				placeholder: 'e.g. USD',
				description: 'The ISO 4217 currency code of the value',
			},
			{
				displayName: 'Time',
				name: 'time',
				type: 'dateTime',
				default: '',
				description: 'When the event happened. Defaults to the time the request is received.',
			},
			{
				displayName: 'Unique ID',
				name: 'uniqueId',
				type: 'string',
				default: '',
				description:
					'Your own identifier for this event. Sending the same unique ID twice records the event once, which makes retries safe.',
			},
		],
	},
	...returnAllFields('event', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: { show: { resource: ['event'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Metric ID',
				name: 'metricId',
				type: 'string',
				default: '',
				description: 'Return only events belonging to this metric',
				routing: {
					send: {
						type: 'query',
						property: 'filter',
						value: '=equals(metric_id,"{{ $value }}")',
					},
				},
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'dateTime',
				default: '',
				description: 'Return only events that happened at or after this time',
				routing: {
					send: {
						type: 'query',
						property: 'filter',
						value: '=greater-or-equal(datetime,{{ $value }})',
					},
				},
			},
			{
				displayName: 'Raw Filter',
				name: 'raw',
				type: 'string',
				default: '',
				placeholder: 'e.g. equals(profile_id,"01GDDKASAP8TKDDA2GRZDSVP4H")',
				description:
					'A filter in the Klaviyo filter syntax, for anything the fields above do not cover. Overrides the other filters.',
				routing: { send: { type: 'query', property: 'filter' } },
			},
		],
	},
];
