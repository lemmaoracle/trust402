## Context

Currently, the demo agent's `AGENT_ID` and `ISSUER_ID` are fixed strings: `did:trust402:demo-agent` and `did:trust402:demo-issuer`. These are read from environment variables in `env.ts`'s `validateEnv` and passed to `createTestCredential` in `artifact.ts`.

To visually convey Trust402's "agent with identity" concept, we adopt ENS subname format (e.g. `agent.trust402.eth`) as agent IDs. Resolving ENS names to addresses at startup and displaying them makes it explicit which Ethereum address the agent is bound to.

## Goals / Non-Goals

**Goals:**
- Enable ENS subnames as AGENT_ID / ISSUER_ID values
- Resolve ENS to address at startup using viem's `getEnsAddress` and log the results
- Fall back to legacy `did:trust402:*` format when ENS names are not configured (backward compatibility)
- Conform to FP rules (pure functions, immutable data, Ramda patterns)

**Non-Goals:**
- ENS reverse resolution (address to name)
- ENS record writes or registration
- On-chain ENS verification (smart contract changes)
- API changes to `@trust402/protocol` or `@trust402/identity`

## Decisions

### D1: Adopt viem as the ENS resolution library

**Choice**: Use viem's `getEnsAddress`
**Rationale**: viem is TypeScript-native with strong type safety and built-in ENS resolution APIs. `createPublicClient` + `http` transport makes RPC-based resolution straightforward.
**Alternative**: ethers.js `provider.resolveName` — heavier dependency with worse FP-style compatibility.

### D2: Storage of resolution results

**Choice**: Add `resolvedAgentAddress` / `resolvedIssuerAddress` as `string | undefined` to `EnvConfig`
**Rationale**: `undefined` is natural when no ENS name is configured (resolution unnecessary). Resolution failures also set `undefined` with a warning log only (does not block startup).
**Alternative**: `Either` / `Result` types — more FP-idiomatic but over-engineering for a demo agent.

### D3: Split `validateEnv` into sync + async phases

**Choice**: Keep `validateEnv` synchronous (basic config) and add a separate `resolveEnsNames` async function (ENS resolution)
**Rationale**: The current `validateEnv` is synchronous; splitting minimizes changes to callers. ENS resolution requires async RPC calls, so it belongs in a separate function.
**Alternative**: Make `validateEnv` itself async — would require changing all call sites with high impact.

### D4: Change default values

**Choice**: Change `AGENT_ID` default to `agent.trust402.eth` and `ISSUER_ID` default to `issuer.trust402.eth`
**Rationale**: New users should experience the ENS format by default.
**Alternative**: Keep `did:trust402:*` defaults — maximally backward-compatible but sacrifices the new-user experience.

### D5: Chain for resolution

**Choice**: Use the RPC endpoint specified by `BASE_SEPOLIA_RPC_URL` environment variable (already exists in env.ts)
**Rationale**: The demo agent is built for the Base Sepolia testnet, which supports ENS resolution. No additional environment variables needed.

## Risks / Trade-offs

- **[ENS resolution failure]** → On network errors or unregistered names, a warning is logged and the ENS name is used as-is for the ID (best-effort resolution). Startup is not blocked.
- **[Backward compatibility]** → Explicitly setting `AGENT_ID` / `ISSUER_ID` environment variables continues to allow the legacy `did:trust402:*` format. Only the default value change is breaking.
- **[viem bundle size]** → viem is tree-shakeable but will increase the demo agent package size. Acceptable since it is a demo package.
