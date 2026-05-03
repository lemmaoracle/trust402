## 1. KeeperHub notification module

- [x] 1.1 Create `packages/protocol/src/keeperhub.ts` with `notifyKeeperHub` function
- [x] 1.2 Add type definitions for `KeeperHubEvent` payload
- [x] 1.3 Implement fire-and-forget webhook POST with error handling
- [x] 1.4 Add unit tests for `notifyKeeperHub`

## 2. Integration with proof failure handling

- [x] 2.1 Update `packages/protocol/src/prove-role-from-artifact.ts` to accept optional `webhookUrl` and `agentId` parameters
- [x] 2.2 Add spend limit exceeded detection in `proveRole` catch block
- [x] 2.3 Call `notifyKeeperHub` when spend limit exceeded is detected
- [x] 2.4 Update `packages/protocol/src/wrap-fetch-with-proof.ts` to accept `webhookUrl` option
- [x] 2.5 Pass webhook URL and agent ID to `proveRoleFromArtifact`

## 3. Demo agent configuration

- [x] 3.1 Add `KEEPERHUB_WEBHOOK_URL` to `packages/demo/agent/src/env.ts`
- [x] 3.2 Pass webhook URL to `wrapFetchWithProof` in demo agent
- [x] 3.3 Create or update `.env.example` with `KEEPERHUB_WEBHOOK_URL` documentation

## 4. Module exports and cleanup

- [x] 4.1 Export `notifyKeeperHub` from `packages/protocol/src/index.ts`
- [x] 4.2 Export new types from `packages/protocol/src/types.ts`
- [x] 4.3 Run tests and verify all pass
