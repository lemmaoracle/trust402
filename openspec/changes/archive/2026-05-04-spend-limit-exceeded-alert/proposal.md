## Why

Trust402 integrates KeeperHub as the human-support and alerting layer for autonomous AI agent payments. Currently, when a ZK proof fails due to spend limit exceeding, there is no mechanism to notify human operators—proof failures are handled silently, leaving the cause of payment gate rejection opaque. By dispatching structured events to KeeperHub via Webhook integration, this change enables real-time visibility and human oversight over agent spending.

## What Changes

- Add `notifyKeeperHub` function in `packages/protocol/src/keeperhub.ts` to POST spend limit exceeded events to KeeperHub Webhook
- Add `notifyKeeperHub` call in `wrapFetchWithProof` proof failure handling to trigger notification when ZK-proven spend limit exceeded error is detected
- Add `KEEPERHUB_WEBHOOK_URL` to demo agent's `.env.example`

## Capabilities

### New Capabilities
- `keeperhub-alert`: Spend limit exceeded notification to KeeperHub Webhook

### Modified Capabilities
- `role-spend-limit-v2`: Add notification trigger on proof failure in wrap-fetch-with-proof

## Impact

- **Code**: `packages/protocol/src/wrap-fetch-with-proof.ts` (add notification call), `packages/protocol/src/keeperhub.ts` (new), `packages/protocol/src/index.ts` (add export), `packages/demo/agent/src/env.ts` (add webhook URL config)
- **API**: External HTTP call to KeeperHub Webhook API (`POST /api/integrations/webhook/{webhookId}`)
- **Dependencies**: Uses existing `fetch` only. No SDK required.
- **Configuration**: Add `KEEPERHUB_WEBHOOK_URL` environment variable (optional, skip notification if unset)
