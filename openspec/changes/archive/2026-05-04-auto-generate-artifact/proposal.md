## Why

The demo agent requires an `IdentityArtifact` to generate ZK proofs for payment, but the auto-generation feature is currently a stub that rejects with "not yet implemented." Users must manually run `trust402 create` + `trust402 prove` as separate CLI steps before running the demo, which breaks the demo's goal of providing a seamless end-to-end experience.

## What Changes

- Implement auto-generation of `IdentityArtifact` in the demo agent when no artifact file exists and the user opts in
- The auto-generation flow: create a default `AgentCredential` → `register()` (commit + encrypt + documents.register) → `prove()` → `submit()` → save artifact to disk
- Add `AGENT_ID`, `ISSUER_ID`, and `HOLDER_PUBLIC_KEY` environment variables for customizing the generated credential
- Fix the `.env` path resolution in `cli.ts` (currently points to `packages/demo/.env` instead of monorepo root `trust402/.env`)

## Capabilities

### New Capabilities
- `artifact-auto-gen`: Automatic IdentityArtifact generation within the demo agent, covering credential creation, register, prove, submit, and persistence

### Modified Capabilities

(none — no existing spec requirements are changing)

## Impact

- **Code**: `packages/demo/agent/src/artifact.ts` (implement auto-gen), `packages/demo/agent/src/env.ts` (add new env vars), `packages/demo/agent/src/cli.ts` (fix .env path)
- **Dependencies**: `@trust402/identity` (register, prove), `@lemmaoracle/agent` (credential)
- **Configuration**: New `AGENT_ID`, `ISSUER_ID`, and `HOLDER_PUBLIC_KEY` env vars in `.env.example`

## Non-goals

- Making auto-generation the default without user confirmation (security: proof submission costs gas/credits)
- Supporting BBS+ selective disclosure in auto-generation
- Custom credential fields beyond the defaults (roles, spendLimit, etc.)
