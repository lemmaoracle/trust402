## Why

AGENT_ID and ISSUER_ID are currently opaque strings like `did:trust402:demo-agent`, making it non-intuitive to identify who the agent is. Adopting ENS subnames (e.g. `agent.trust402.eth`) as IDs makes Trust402's "agent with identity" concept visually apparent and provides a human-readable namespace.

## What Changes

- Add `AGENT_ENS_NAME` / `ISSUER_ENS_NAME` environment variables to configure ENS names
- Resolve ENS names to addresses at startup using viem's `getEnsAddress` and log the results
- Use ENS names as `subjectId` / `issuerId` in `createTestCredential`
- Change default values for `agentId` / `issuerId` to ENS subname format

## Capabilities

### New Capabilities
- `ens-resolution`: ENS name to Ethereum address resolution. Uses viem/ens `getEnsAddress` to resolve at startup and logs the results.

### Modified Capabilities
- `demo-agent`: Agent ID and issuer ID representation changes from `did:trust402:*` to ENS subname format. `agentEnsName` / `issuerEnsName` / `resolvedAgentAddress` / `resolvedIssuerAddress` are added to `EnvConfig`.

## Impact

- **packages/demo/agent/src/env.ts**: Read `AGENT_ENS_NAME` / `ISSUER_ENS_NAME` environment variables, add viem-based address resolution logic. Extend `EnvConfig` type.
- **packages/demo/agent/src/artifact.ts**: Change how ENS names are passed as `subjectId` / `issuerId` in `createTestCredential`.
- **packages/demo/agent/package.json**: Add `viem` dependency.
- **Backward compatibility**: `AGENT_ID` / `ISSUER_ID` environment variables continue to work. Falls back to the legacy `did:trust402:*` format when ENS names are not configured.

### Non-goals

- No ENS reverse resolution (address to name)
- No ENS record writes or registration
- No on-chain ENS verification (within smart contracts) — out of scope
- No changes to `@trust402/protocol` or `@trust402/identity` packages (demo agent display/input layer only)
