/**
 * Checks the request bodies this node builds against the shapes Klaviyo's own
 * OpenAPI spec declares.
 *
 * The three preSend builders assemble deeply nested JSON:API payloads by hand,
 * which is exactly where a silent mistake would live: a wrong key sends a request
 * Klaviyo answers 400 to, or worse, accepts while quietly ignoring half of it.
 * Every other operation routes through declarative field mapping that n8n itself
 * validates, so these three are the ones worth pinning down.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { presendSubscribe, presendUnsubscribe } = require('../dist/nodes/Klaviyo/shared/subscription.js');
const { presendEvent } = require('../dist/nodes/Klaviyo/shared/event.js');
const { presendProfileRelationship } = require('../dist/nodes/Klaviyo/shared/relationships.js');

const ctx = (params) => ({
	getNodeParameter: (name, fallback) => (name in params ? params[name] : fallback),
	getNode: () => ({ name: 'Klaviyo', type: 'klaviyo', typeVersion: 1 }),
	getItemIndex: () => 0,
});

const run = async (fn, params) => {
	const options = { method: 'POST', url: '/x' };
	return (await fn.call(ctx(params), options)).body;
};

let failures = 0;
const check = async (label, fn) => {
	try {
		await fn();
		console.log(`  ok    ${label}`);
	} catch (error) {
		failures++;
		console.log(`  FAIL  ${label}\n        ${error.message.split('\n')[0]}`);
	}
};

console.log('\nSubscribe / unsubscribe');

await check('subscribe builds the bulk-create job Klaviyo documents', async () => {
	const body = await run(presendSubscribe, {
		subscribeEmail: 'nathan@example.com',
		subscribePhone: '',
		channels: ['email'],
		subscribeListId: 'Y6nRLr',
		customSource: 'Checkout page',
	});
	assert.deepEqual(body, {
		data: {
			type: 'profile-subscription-bulk-create-job',
			attributes: {
				profiles: {
					data: [
						{
							type: 'profile',
							attributes: {
								subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } },
								email: 'nathan@example.com',
							},
						},
					],
				},
				custom_source: 'Checkout page',
			},
			relationships: { list: { data: { type: 'list', id: 'Y6nRLr' } } },
		},
	});
});

await check('unsubscribe flips the consent and the job type', async () => {
	const body = await run(presendUnsubscribe, {
		subscribeEmail: 'nathan@example.com',
		subscribePhone: '',
		channels: ['email'],
		subscribeListId: 'Y6nRLr',
	});
	assert.equal(body.data.type, 'profile-subscription-bulk-delete-job');
	assert.deepEqual(body.data.attributes.profiles.data[0].attributes.subscriptions, {
		email: { marketing: { consent: 'UNSUBSCRIBED' } },
	});
	// custom_source is a subscribe-only field; sending it on a delete job is rejected.
	assert.equal('custom_source' in body.data.attributes, false);
});

await check('sms consent carries the phone number, not the email', async () => {
	const body = await run(presendSubscribe, {
		subscribeEmail: '',
		subscribePhone: '+15005550006',
		channels: ['sms'],
		subscribeListId: 'Y6nRLr',
	});
	const attrs = body.data.attributes.profiles.data[0].attributes;
	assert.equal(attrs.phone_number, '+15005550006');
	assert.deepEqual(attrs.subscriptions, { sms: { marketing: { consent: 'SUBSCRIBED' } } });
});

await check('sms without a phone number is refused before the request leaves', async () => {
	await assert.rejects(
		run(presendSubscribe, {
			subscribeEmail: 'nathan@example.com',
			subscribePhone: '',
			channels: ['sms'],
			subscribeListId: 'Y6nRLr',
		}),
		/phone number/i,
	);
});

await check('no identifier at all is refused', async () => {
	await assert.rejects(
		run(presendSubscribe, {
			subscribeEmail: '',
			subscribePhone: '',
			channels: ['email'],
			subscribeListId: 'Y6nRLr',
		}),
		/Email.*Phone Number/i,
	);
});

console.log('\nEvent');

await check('event nests metric and profile as resource objects', async () => {
	const body = await run(presendEvent, {
		metricName: 'Placed Order',
		email: 'nathan@example.com',
		phoneNumber: '',
		eventProperties: { property: [{ name: 'orderId', value: 'A-1' }] },
		options: { value: 42.5, valueCurrency: 'USD', uniqueId: 'order-A-1' },
	});
	assert.deepEqual(body, {
		data: {
			type: 'event',
			attributes: {
				properties: { orderId: 'A-1' },
				metric: { data: { type: 'metric', attributes: { name: 'Placed Order' } } },
				profile: { data: { type: 'profile', attributes: { email: 'nathan@example.com' } } },
				value: 42.5,
				value_currency: 'USD',
				unique_id: 'order-A-1',
			},
		},
	});
});

await check('an event with no properties still sends the required empty object', async () => {
	const body = await run(presendEvent, {
		metricName: 'Trial Started',
		email: 'nathan@example.com',
		phoneNumber: '',
		eventProperties: {},
		options: {},
	});
	assert.deepEqual(body.data.attributes.properties, {});
	assert.equal('value' in body.data.attributes, false);
});

await check('a zero value is still sent, not dropped as falsy', async () => {
	const body = await run(presendEvent, {
		metricName: 'Refund',
		email: 'nathan@example.com',
		phoneNumber: '',
		eventProperties: {},
		options: { value: 0 },
	});
	assert.equal(body.data.attributes.value, 0);
});

console.log('\nList relationships');

await check('profile IDs become a bare resource identifier array', async () => {
	const body = await run(presendProfileRelationship, { profileIds: 'AAA, BBB ,CCC' });
	assert.deepEqual(body, {
		data: [
			{ type: 'profile', id: 'AAA' },
			{ type: 'profile', id: 'BBB' },
			{ type: 'profile', id: 'CCC' },
		],
	});
});

await check('an empty profile ID list is refused', async () => {
	await assert.rejects(run(presendProfileRelationship, { profileIds: '  ,  ' }), /profile IDs/i);
});

console.log(failures ? `\n${failures} check(s) failed` : '\nAll body checks passed');
process.exit(failures ? 1 : 0);
