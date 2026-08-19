import type { INodeProperties } from 'n8n-workflow';

import { resourceLocator, returnAllFields, rootDataProperty } from '../shared/descriptions';
import { acceptedJobResponse, presendSubscribe, presendUnsubscribe } from '../shared/subscription';

const only = (operation: string) => ({ resource: ['profile'], operation: [operation] });

const attributeOptions: INodeProperties[] = [
	{
		displayName: 'External ID',
		name: 'external_id',
		type: 'string',
		default: '',
		description: 'A unique identifier from your own system, used to match this profile',
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		default: '',
		placeholder: 'e.g. Nathan',
		description: 'The first name of the individual',
	},
	{
		displayName: 'Last Name',
		name: 'last_name',
		type: 'string',
		default: '',
		placeholder: 'e.g. Smith',
		description: 'The last name of the individual',
	},
	{
		displayName: 'Organization',
		name: 'organization',
		type: 'string',
		default: '',
		description: 'Name of the company or organization the individual belongs to',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The job title of the individual',
	},
	{
		displayName: 'Locale',
		name: 'locale',
		type: 'string',
		default: '',
		placeholder: 'e.g. en-US',
		description: 'The locale of the profile, as an IETF BCP 47 language tag',
	},
	{
		displayName: 'Image',
		name: 'image',
		type: 'string',
		default: '',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'URL pointing to the location of a profile image',
	},
];

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'upsert',
		displayOptions: { show: { resource: ['profile'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a profile',
				description: 'Add a new profile, failing if one with the same email already exists',
				routing: {
					request: {
						method: 'POST',
						url: '/api/profiles',
						body: { data: { type: 'profile' } },
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Create or Update',
				value: 'upsert',
				action: 'Create or update a profile',
				description: 'Create a new record, or update the current one if it already exists (upsert)',
				routing: {
					request: {
						method: 'POST',
						url: '/api/profile-import',
						body: { data: { type: 'profile' } },
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a profile',
				description: 'Retrieve a single profile by its ID',
				routing: {
					request: { method: 'GET', url: '=/api/profiles/{{ $parameter.profileId }}' },
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many profiles',
				description: 'Retrieve a list of profiles, with optional filtering',
				routing: {
					request: { method: 'GET', url: '/api/profiles' },
					...rootDataProperty,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a profile',
				description: 'Change the fields of an existing profile',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/profiles/{{ $parameter.profileId }}',
						body: { data: { type: 'profile', id: '={{ $parameter.profileId }}' } },
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Subscribe',
				value: 'subscribe',
				action: 'Subscribe a profile',
				description: 'Record marketing consent for a profile on one or more channels',
				routing: {
					request: { method: 'POST', url: '/api/profile-subscription-bulk-create-jobs' },
					send: { preSend: [presendSubscribe] },
					output: { postReceive: [acceptedJobResponse] },
				},
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
				action: 'Unsubscribe a profile',
				description: 'Withdraw marketing consent from a profile on one or more channels',
				routing: {
					request: { method: 'POST', url: '/api/profile-subscription-bulk-delete-jobs' },
					send: { preSend: [presendUnsubscribe] },
					output: { postReceive: [acceptedJobResponse] },
				},
			},
		],
	},
];

export const profileFields: INodeProperties[] = [
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 01GDDKASAP8TKDDA2GRZDSVP4H',
		description: 'The Klaviyo ID of the profile',
		displayOptions: { show: { resource: ['profile'], operation: ['get', 'update'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'The email address of the individual',
		displayOptions: { show: { resource: ['profile'], operation: ['create', 'upsert'] } },
		routing: { send: { type: 'body', property: 'data.attributes.email' } },
	},
	{
		displayName: 'Phone Number',
		name: 'phoneNumber',
		type: 'string',
		default: '',
		placeholder: 'e.g. +15005550006',
		description: 'The phone number of the individual, in E.164 format',
		displayOptions: { show: { resource: ['profile'], operation: ['create', 'upsert'] } },
		routing: { send: { type: 'body', property: 'data.attributes.phone_number' } },
	},
	{
		displayName: 'Fields',
		name: 'attributes',
		type: 'collection',
		default: {},
		placeholder: 'Add Field',
		displayOptions: { show: { resource: ['profile'], operation: ['create', 'upsert', 'update'] } },
		options: attributeOptions,
		routing: { send: { type: 'body', property: 'data.attributes', value: '={{ $value }}' } },
	},
	{
		displayName: 'Custom Properties',
		name: 'customProperties',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Custom Property',
		description: 'Your own properties to store on the profile, alongside the standard fields',
		displayOptions: { show: { resource: ['profile'], operation: ['create', 'upsert', 'update'] } },
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
						placeholder: 'e.g. favoriteColor',
					},
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'data.attributes.properties',
				value: '={{ Object.fromEntries(($value.property || []).map((p) => [p.name, p.value])) }}',
			},
		},
	},

	...returnAllFields('profile', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: { show: only('getAll') },
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'e.g. nathan@example.com',
				description: 'Return only the profile with this exact email address',
				routing: {
					send: { type: 'query', property: 'filter', value: '=equals(email,"{{ $value }}")' },
				},
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
				description: 'Return only profiles updated at or after this time',
				routing: {
					send: {
						type: 'query',
						property: 'filter',
						value: '=greater-or-equal(updated,{{ $value }})',
					},
				},
			},
			{
				displayName: 'Raw Filter',
				name: 'raw',
				type: 'string',
				default: '',
				placeholder: 'e.g. any(email,["a@example.com","b@example.com"])',
				description:
					'A filter in the Klaviyo filter syntax, for anything the fields above do not cover. Overrides the other filters.',
				routing: { send: { type: 'query', property: 'filter' } },
			},
		],
	},

	{
		displayName: 'Email',
		name: 'subscribeEmail',
		type: 'string',
		default: '',
		placeholder: 'e.g. nathan@example.com',
		description: 'The email address to change consent for. Leave empty to use a phone number.',
		displayOptions: { show: { resource: ['profile'], operation: ['subscribe', 'unsubscribe'] } },
	},
	{
		displayName: 'Phone Number',
		name: 'subscribePhone',
		type: 'string',
		default: '',
		placeholder: 'e.g. +15005550006',
		description: 'The phone number to change consent for, in E.164 format',
		displayOptions: { show: { resource: ['profile'], operation: ['subscribe', 'unsubscribe'] } },
	},
	{
		displayName: 'Channels',
		name: 'channels',
		type: 'multiOptions',
		default: ['email'],
		required: true,
		description: 'Which channels the consent change applies to',
		displayOptions: { show: { resource: ['profile'], operation: ['subscribe', 'unsubscribe'] } },
		options: [
			{ name: 'Email', value: 'email' },
			{ name: 'Push', value: 'push' },
			{ name: 'SMS', value: 'sms' },
			{ name: 'WhatsApp', value: 'whatsapp' },
		],
	},
	resourceLocator(
		'subscribeListId',
		'List',
		'getLists',
		'The list the consent applies to. Klaviyo records subscribe and unsubscribe against a list.',
		{ resource: ['profile'], operation: ['subscribe', 'unsubscribe'] },
	),
	{
		displayName: 'Custom Source',
		name: 'customSource',
		type: 'string',
		default: '',
		placeholder: 'e.g. Checkout page',
		description: 'Where the consent was collected, stored against the profile in Klaviyo',
		displayOptions: { show: only('subscribe') },
	},
];
