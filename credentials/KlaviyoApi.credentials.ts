import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import { KLAVIYO_API_REVISION, KLAVIYO_BASE_URL } from '../nodes/Klaviyo/shared/constants';

export class KlaviyoApi implements ICredentialType {
	name = 'klaviyoApi';

	displayName = 'Klaviyo API';

	icon: Icon = { light: 'file:../icons/klaviyo.svg', dark: 'file:../icons/klaviyo.dark.svg' };

	documentationUrl = 'https://developers.klaviyo.com/en/docs/authenticate_';

	properties: INodeProperties[] = [
		{
			displayName: 'Private API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'e.g. pk_0123456789abcdef0123456789abcdef01',
			description:
				'Create one in Klaviyo under Settings > Account > API keys > Create private API key. Give it read and write access to the scopes you plan to use.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Klaviyo-API-Key {{$credentials.apiKey}}',
				revision: KLAVIYO_API_REVISION,
				accept: 'application/vnd.api+json',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: KLAVIYO_BASE_URL,
			url: '/api/accounts',
			method: 'GET',
		},
	};
}
