import type { INodeProperties } from 'n8n-workflow';

import { resourceLocator, returnAllFields, rootDataProperty } from '../shared/descriptions';

export const segmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: { show: { resource: ['segment'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a segment',
				description: 'Retrieve a single segment by its ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/segments/{{ $parameter.segmentId.value || $parameter.segmentId }}',
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many segments',
				description: 'Retrieve every segment in the account',
				routing: {
					request: { method: 'GET', url: '/api/segments' },
					...rootDataProperty,
				},
			},
			{
				name: 'Get Profiles',
				value: 'getProfiles',
				action: 'Get profiles in segment',
				description: 'Retrieve the profiles that currently match a segment',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/segments/{{ $parameter.segmentId.value || $parameter.segmentId }}/profiles',
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a segment',
				description: 'Rename an existing segment',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/api/segments/{{ $parameter.segmentId.value || $parameter.segmentId }}',
						body: {
							data: {
								type: 'segment',
								id: '={{ $parameter.segmentId.value || $parameter.segmentId }}',
							},
						},
					},
					...rootDataProperty,
				},
			},
		],
	},
];

export const segmentFields: INodeProperties[] = [
	resourceLocator('segmentId', 'Segment', 'getSegments', 'The segment to act on', {
		resource: ['segment'],
		operation: ['get', 'getProfiles', 'update'],
	}),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Engaged in the last 30 days',
		description: 'The name of the segment',
		displayOptions: { show: { resource: ['segment'], operation: ['update'] } },
		routing: { send: { type: 'body', property: 'data.attributes.name' } },
	},
	...returnAllFields('segment', 'getAll'),
	...returnAllFields('segment', 'getProfiles'),
];
