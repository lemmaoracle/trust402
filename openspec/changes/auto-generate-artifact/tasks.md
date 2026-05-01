## 1. Fix .env Path

- [ ] 1.1 Fix `cli.ts` dotenv path: change `"..", "..", "..", ".env"` to `"..", "..", "..", "..", ".env"` so it resolves to `trust402/.env` [US1]

## 2. Add Environment Variables

- [ ] 2.1 Add `AGENT_ID` and `ISSUER_ID` to `EnvConfig` type and `validateEnv()` in `env.ts` (with defaults `"did:trust402:demo-agent"` and `"did:trust402:demo-issuer"`) [US1]
- [ ] 2.2 Add `HOLDER_PUBLIC_KEY` to `EnvConfig` type and `validateEnv()` in `env.ts` [US1]
- [ ] 2.3 Add `AGENT_ID`, `ISSUER_ID`, and `HOLDER_PUBLIC_KEY` placeholders to root `.env.example` [US1] [P]

## 3. Implement Auto-Generation

- [ ] 3.1 Add `@trust402/identity` and `@lemmaoracle/agent` to `@trust402/demo-agent` dependencies (if not already present) [US2]
- [ ] 3.2 Implement `generateArtifact()` function in `artifact.ts` that creates a default credential, calls `register()` from `@trust402/identity` (which performs commit + encrypt + documents.register), then calls `prove()`, and saves the resulting `{ commitOutput, identityProof, docHash, credential }` to `ARTIFACT_PATH` [US2]
- [ ] 3.3 Replace the stub `Promise.reject("not yet implemented")` in `loadOrPromptArtifact` with a call to `generateArtifact()` [US2]

## 4. Verify

- [ ] 4.1 Run `pnpm -F demo-agent dev` and confirm auto-generation produces a valid artifact file [US2]
- [ ] 4.2 Re-run `pnpm -F demo-agent dev` and confirm the artifact is loaded from disk without regeneration [US2]
