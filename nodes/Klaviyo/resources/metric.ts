import type { INodeProperties } from 'n8n-workflow';

import { resourceLocator, returnAllFields, rootDataProperty } from '../shared/descriptions';

export const metricOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getAll',
		displayOptions: { show: { resource: ['metric'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a metric',
				description: 'Retrieve a single metric by its ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/api/metrics/{{ $parameter.metricId.value || $parameter.metricId }}',
					},
					...rootDataProperty,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many metrics',
				description: 'Retrieve every metric the account has recorded',
				routing: {
					request: { method: 'GET', url: '/api/metrics' },
					...rootDataProperty,
				},
			},
		],
	},
];

export const metricFields: INodeProperties[] = [
	resourceLocator('metricId', 'Metric', 'getMetrics', 'The metric to retrieve', {
		resource: ['metric'],
		operation: ['get'],
	}),
	...returnAllFields('metric', 'getAll'),
];
