import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { KLAVIYO_API_REVISION, KLAVIYO_BASE_URL } from './shared/constants';
import { getLists } from './listSearch/getLists';
import { getMetrics } from './listSearch/getMetrics';
import { getSegments } from './listSearch/getSegments';
import { campaignFields, campaignOperations } from './resources/campaign';
import { eventFields, eventOperations } from './resources/event';
import { listFields, listOperations } from './resources/list';
import { metricFields, metricOperations } from './resources/metric';
import { profileFields, profileOperations } from './resources/profile';
import { segmentFields, segmentOperations } from './resources/segment';

export class Klaviyo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Klaviyo',
		name: 'klaviyo',
		icon: { light: 'file:../../icons/klaviyo.svg', dark: 'file:../../icons/klaviyo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with profiles, lists, segments, events, metrics and campaigns in Klaviyo',
		defaults: { name: 'Klaviyo' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'klaviyoApi', required: true }],
		requestDefaults: {
			baseURL: KLAVIYO_BASE_URL,
			headers: {
				accept: 'application/vnd.api+json',
				'content-type': 'application/vnd.api+json',
				revision: KLAVIYO_API_REVISION,
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'profile',
				options: [
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Event', value: 'event' },
					{ name: 'List', value: 'list' },
					{ name: 'Metric', value: 'metric' },
					{ name: 'Profile', value: 'profile' },
					{ name: 'Segment', value: 'segment' },
				],
			},
			...campaignOperations,
			...eventOperations,
			...listOperations,
			...metricOperations,
			...profileOperations,
			...segmentOperations,
			...campaignFields,
			...eventFields,
			...listFields,
			...metricFields,
			...profileFields,
			...segmentFields,
		],
	};

	methods = {
		listSearch: {
			getLists,
			getMetrics,
			getSegments,
		},
	};
}
