# n8n-nodes-klaviyo-api

An n8n community node for [Klaviyo](https://www.klaviyo.com/) — the email and SMS
marketing platform used by a large share of ecommerce stores.

It covers the parts of Klaviyo that automations actually reach for: adding and
updating people, moving them in and out of lists, recording consent, tracking the
events that start flows, and reading back segments, metrics and campaigns. A
trigger node is included so a workflow can start the moment something happens in
Klaviyo.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/)
workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Trigger](#trigger)
- [Example workflows](#example-workflows)
- [Notes and limitations](#notes-and-limitations)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the
[community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
and use the package name:

```
n8n-nodes-klaviyo-api
```

On self-hosted n8n you can also install it from the command line:

```bash
npm install n8n-nodes-klaviyo-api
```

## Credentials

The node authenticates with a **private API key**.

1. In Klaviyo, go to **Settings → Account → API keys**.
2. Click **Create private API key**.
3. Give it a label, and grant read and write access to the scopes you plan to use
   (Profiles, Lists, Segments, Events, Metrics, Campaigns, Webhooks).
4. Copy the key — it starts with `pk_` — into the credential in n8n.

Private API keys are account-wide, so scope them down to what the workflow needs
rather than granting full access.

Use the **Test** button on the credential to confirm it works before building
anything on top of it.

## Operations

### Profile

| Operation | What it does |
| --- | --- |
| Create | Adds a new profile, failing if one with the same email already exists |
| Create or Update | Adds a profile, or updates it if Klaviyo already knows the person (upsert) |
| Get | Retrieves one profile by its Klaviyo ID |
| Get Many | Lists profiles, filtered by email, last-updated date, or a raw filter |
| Update | Changes fields on an existing profile |
| Subscribe | Records marketing consent on Email, SMS, WhatsApp or Push |
| Unsubscribe | Withdraws marketing consent on those channels |

Custom properties can be set on create, upsert and update without leaving the UI.

**Create or Update is usually the one you want.** Create fails on a duplicate,
which in practice means the second time the same customer appears.

### List

Create · Get · Get Many · Update · Delete · Get Profiles · Add Profiles ·
Remove Profiles

Adding a profile to a list is not the same as subscribing it. Use **Add Profiles**
to put someone on a list, and **Profile → Subscribe** when you have consent to
market to them.

### Event

| Operation | What it does |
| --- | --- |
| Create | Records an event against a profile, which is what starts a Klaviyo flow |
| Get | Retrieves one event |
| Get Many | Lists events, filtered by metric or date |

Klaviyo creates the metric the first time it sees a new metric name, so there is
no separate step to define one. Set **Unique ID** if the workflow might retry:
Klaviyo records an event with a repeated unique ID only once.

### Segment

Get · Get Many · Update · Get Profiles

### Metric

Get · Get Many

### Campaign

Get · Get Many · Delete · Send

Listing campaigns requires choosing a channel — that is Klaviyo's rule, not a
choice made here — and can be narrowed further by status.

## Trigger

The **Klaviyo Trigger** node registers a webhook in your Klaviyo account when the
workflow is activated, and removes it again when the workflow is deactivated. Pick
the topics you want from the dropdown, which is loaded live from your account so
it always matches what Klaviyo currently offers.

Every delivery is signed by Klaviyo, and the trigger rejects any request whose
signature does not match, so the webhook URL alone is not enough for someone else
to push data into your workflow. You can supply your own secret key under
**Options**, or leave it empty and one is derived for you.

Klaviyo only delivers to **https** URLs. A local n8n on plain http cannot receive
these webhooks; the node says so when you activate the workflow rather than
failing silently later.

## Example workflows

**Sync new customers into a list**

`Shopify Trigger` → `Klaviyo: Profile → Create or Update` →
`Klaviyo: List → Add Profiles`

**Track a custom event that starts a flow**

`Webhook` → `Klaviyo: Event → Create` with metric name `Trial Started` and a
`plan` property. Build the Klaviyo flow off that metric.

**Send a Slack alert when someone unsubscribes**

`Klaviyo Trigger` on the unsubscribe topic → `Slack: Send Message`

**Weekly reporting**

`Schedule Trigger` → `Klaviyo: Segment → Get Profiles` → `Google Sheets: Append`

## Notes and limitations

- **API revision.** Klaviyo versions its API by date and this node pins revision
  `2026-07-15`. Klaviyo supports each revision for two years, so a pinned revision
  keeps existing workflows working when Klaviyo ships breaking changes. Newer
  fields become available when the node is updated.
- **Consent is a queued job.** Subscribe and Unsubscribe return `202 Accepted`
  immediately; Klaviyo applies them a moment later. The node emits a confirmation
  item so the branch keeps running, but reading the profile back in the same
  execution may still show the old state.
- **Campaign creation is not included.** Building a campaign needs audiences, a
  send strategy and message content, which is a large form for something almost
  everyone does in Klaviyo's editor. Campaigns can be listed, read, sent and
  deleted here.
- **Rate limits.** Klaviyo applies per-endpoint burst and steady limits and answers
  `429` when you cross them. Use the node's built-in **Retry On Fail** setting for
  bulk work.
- **Profile IDs, not emails.** List Add/Remove Profiles takes Klaviyo profile IDs.
  Look the profile up first (Profile → Get Many, filtered by email) if you only
  have an address.

## Compatibility

Tested against n8n 2.x. Requires Node.js 20.15 or newer, which n8n itself already
requires.

The package has no runtime dependencies.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Klaviyo API reference](https://developers.klaviyo.com/en/reference/api_overview)
- [Klaviyo API versioning policy](https://developers.klaviyo.com/en/docs/api_versioning_and_deprecation_policy)

## License

[MIT](LICENSE.md)
