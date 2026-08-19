import type { INodeProperties } from 'n8n-workflow';

import {
	PAGE_SIZE,
	resourceLocator,
	returnAllFields,
	rootDataProperty,
} from '../shared/descriptions';
import { deletedConfirmation, presendProfileRelationship } from '../shared/relationships';

const listLocator = (operations: string[]) =>
	resourceLocator('listId', 'List', 'getLists', 'The list to act on', {
		resource: ['list'],
		operation: operations,
	});

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: { show: { resource: ['list'] } },
		options: [
			{
				name: 'Add Profiles',
				value: 'addProfiles',
				action: 'Add profiles to list',
				description: 'Add one or more profiles to a list',
				routing: {
					request: {
						method: 'POST',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}/relationships/profiles',
					},
					send: { preSend: [presendProfileRelationship] },
					output: { postReceive: [deletedConfirmation] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a list',
				description: 'Add a new list to the account',
				routing: {
					request: {
						method: 'POST',
						url: '/api/lists',
						body: { data: { type: 'list' } },
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a list',
				description: 'Delete a list permanently',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}',
					},
					output: { postReceive: [deletedConfirmation] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a list',
				description: 'Retrieve a single list by its ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}',
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many lists',
				description: 'Retrieve every list in the account',
				routing: {
					request: { method: 'GET', url: '/api/lists' },
					...rootDataProperty,
				},
			},
			{
				name: 'Get Profiles',
				value: 'getProfiles',
				action: 'Get profiles in list',
				description: 'Retrieve the profiles that belong to a list',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}/profiles',
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Remove Profiles',
				value: 'removeProfiles',
				action: 'Remove profiles from list',
				description: 'Remove one or more profiles from a list',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}/relationships/profiles',
					},
					send: { preSend: [presendProfileRelationship] },
					output: { postReceive: [deletedConfirmation] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a list',
				description: 'Rename an existing list',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/lists/{{ $parameter.listId.value || $parameter.listId }}',
						body: {
							data: {
								type: 'list',
								id: '={{ $parameter.listId.value || $parameter.listId }}',
							},
						},
					},
					...rootDataProperty,
				},
			},
		],
	},
];

export const listFields: INodeProperties[] = [
	listLocator(['get', 'update', 'delete', 'getProfiles', 'addProfiles', 'removeProfiles']),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Newsletter subscribers',
		description: 'The name of the list',
		displayOptions: { show: { resource: ['list'], operation: ['create', 'update'] } },
		routing: { send: { type: 'body', property: 'data.attributes.name' } },
	},
	{
		displayName: 'Profile IDs',
		name: 'profileIds',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. 01GDDKASAP8TKDDA2GRZDSVP4H',
		description:
			'Klaviyo IDs of the profiles, separated by commas. These are profile IDs, not email addresses.',
		displayOptions: {
			show: { resource: ['list'], operation: ['addProfiles', 'removeProfiles'] },
		},
	},
	...returnAllFields('list', 'getAll', PAGE_SIZE.lists),
	...returnAllFields('list', 'getProfiles', PAGE_SIZE.nestedProfiles),
];
