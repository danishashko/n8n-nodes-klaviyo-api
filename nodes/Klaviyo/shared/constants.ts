/**
 * Klaviyo pins every endpoint to a dated revision, sent as a `revision` header on
 * every request. A revision is supported for two years after release, and omitting
 * the header falls back to the oldest supported one - so it is pinned here rather
 * than left to the API's default, and bumped deliberately when the node is updated.
 *
 * https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy
 */
export const KLAVIYO_API_REVISION = '2026-07-15';

export const KLAVIYO_BASE_URL = 'https://a.klaviyo.com';
