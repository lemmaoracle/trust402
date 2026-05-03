## 1. Dependencies & Setup

- [ ] 1.1 Add `viem` dependency to `packages/demo/agent/package.json` [US1]
- [ ] 1.2 Add `AGENT_ENS_NAME` and `ISSUER_ENS_NAME` fields to `EnvConfig` type in `env.ts`, with defaults `agent.trust402.eth` and `issuer.trust402.eth` [US1]

## 2. ENS Resolution Module

- [ ] 2.1 Create `packages/demo/agent/src/ens.ts` with `resolveEnsName` pure function that takes an RPC URL and ENS name, returns `Promise<string | undefined>` using viem's `getEnsAddress` [US1]
- [ ] 2.2 Create `resolveEnsNames` function that takes `EnvConfig` and returns `Promise<EnvConfig>` with `resolvedAgentAddress` and `resolvedIssuerAddress` populated, using FP patterns (R.pipe, R.assoc) [US1]
- [ ] 2.3 Add ENS resolution logging: log `✓ <name> → <address>` on success, `⚠ Could not resolve <name>` on failure [US2]
- [ ] 2.4 Write `ens.test.ts` with unit tests for `resolveEnsName` (mock viem client) [US1]

## 3. Environment Configuration Update

- [ ] 3.1 Update `validateEnv` in `env.ts`: read `AGENT_ENS_NAME` / `ISSUER_ENS_NAME` env vars, fall back to `AGENT_ID` / `ISSUER_ID` if set (AGENT_ID takes precedence over ENS default) [US1]
- [ ] 3.2 Add `resolvedAgentAddress: string | undefined` and `resolvedIssuerAddress: string | undefined` to `EnvConfig` (initially `undefined` in `validateEnv`, populated by `resolveEnsNames`) [US1]
- [ ] 3.3 Change default `agentId` from `did:trust402:demo-agent` to `agent.trust402.eth` and `issuerId` from `did:trust402:demo-issuer` to `issuer.trust402.eth` [US1]
- [ ] 3.4 Update `env.test.ts` with tests for new env vars and precedence logic [US1]

## 4. Credential & Startup Integration

- [ ] 4.1 Update `createTestCredential` in `artifact.ts` to use `env.agentId` / `env.issuerId` (ENS names) as `subjectId` / `issuerId` — no code change needed if defaults already flow through [US2]
- [ ] 4.2 Integrate `resolveEnsNames` call in the main startup flow (after `validateEnv`, before `loadOrPromptArtifact`) [US2]
- [ ] 4.3 Display ENS resolution results in the startup banner / budget table output [US2]
- [ ] 4.4 Write integration test verifying full flow: env with ENS names → resolve → credential creation [US2]
