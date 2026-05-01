## Context

Trust402 ships the core building blocks for buyer-side ZK proof-gated payments:

- `@trust402/identity` — commit / prove / submit for agent identity (`agent-identity-v1` circuit)
- `@trust402/roles` — witness / prove / submit for role enforcement (`role-spend-limit-v1` circuit)
- `@trust402/protocol` — `wrapFetchWithProof` (composes identity artifact + role proof before fetch) and `proveRoleFromArtifact` (standalone proof generation)

The Lemma platform provides the seller-side attestation infrastructure:

- `@lemmaoracle/x402` — extends `@coinbase/x402` server middleware to include docHash attestation in responses. Documents are registered with the Lemma oracle via a separate pre-registration script (not at runtime), following the pattern of `example-x402/scripts/register-with-full-content.ts`
- `@lemmaoracle/sdk` — LemmaClient for registering schemas, submitting proofs, and verifying attestations
- `lemma/packages/agent/normalize` — Rust→WASM normalization for transforming data into circuit inputs (pure normalization; docHash is derived by the Lemma oracle during registration, not by the normalizer)
- `lemma/packages/agent/circuits` — Foundry ZK circuits for on-chain verification

The `example-x402` monorepo demonstrates the full Lemma-augmented x402 flow on the worker side, using `@lemmaoracle/x402` with the resource server pattern from lines 17–23 of `example-x402/packages/worker/src/index.ts`.

## Goals / Non-Goals

**Goals:**

- Provide a self-contained, runnable demo that showcases the full Trust402 agent payment flow with Lemma attestation verification
- Demonstrate `@lemmaoracle/x402` server-side integration for serving attested financial data
- Demonstrate `wrapFetchWithProof` composition with `@x402/fetch` for a paid corporate IR API
- Simulate AI agent reasoning without requiring an actual LLM
- Prompt the user interactively when IdentityArtifact generation is needed
- Verify the `attestation` (docHash) from the API response via the Lemma oracle
- Output a human-readable proof summary after payment and verification

**Non-Goals:**

- Real LLM integration or configurable agent prompts
- Production-grade ZK circuits — the demo circuit is a minimal stub that proves a simplified attestation
- Production-grade normalization — the demo normalizer is a minimal Rust→WASM module
- Offline / demo mode — the demo always uses real network services
- General-purpose agent framework or plugin architecture
- Full parity with `lemma/packages/agent` circuit complexity (ECDSA, Poseidon, etc.)

## Decisions

### D1: Scripted agent instead of real LLM

**Decision:** The demo agent uses a hardcoded reasoning flow rather than connecting to an LLM API.

**Rationale:** Running a real LLM introduces cost (API keys), latency (2–10s per inference call), and non-determinism (the agent might not follow the expected path). For a demo, predictability and repeatability are more valuable than genuine AI. The CLI will use typewriter effects and staged output to give the *impression* of AI reasoning.

**Alternatives considered:**
- OpenAI / Anthropic API integration: adds $0.01–0.10 per demo run and variable latency; rejected for stability
- Local LLM (ollama): requires setup and hardware; rejected for portability

### D2: Corporate IR financial data as the paid API

**Decision:** The demo resource exposes a corporate IR endpoint (`GET /ir/2026q1`) that returns quarterly financial data with a `docHash` attestation behind a $0.01 USDC paywall.

**Rationale:** Corporate IR APIs are a realistic use case for paid data with verifiable authenticity. The `attestation` field (docHash) naturally maps to the Lemma oracle's verification flow: the buyer can verify that the financial data hasn't been tampered with. This replaces the original weather API proposal, which had no natural attestation use case.

**Alternatives considered:**
- Weather API: too generic, no meaningful attestation story; rejected
- Credit score API: more sensitive and harder to mock; rejected for simplicity

### D3: Lemma-augmented x402 on seller side

**Decision:** The demo resource server uses `@lemmaoracle/x402` (not plain `@coinbase/x402`) following the same pattern as `example-x402/packages/worker/src/index.ts:17-23`.

**Rationale:** The user explicitly requested Lemma's x402 integration. Using `@lemmaoracle/x402` provides the `docHash` attestation in API responses. This is the core differentiator: the buyer can verify the purchased data's authenticity via the Lemma oracle, not just pay for access.

**Alternatives considered:**
- Plain `@coinbase/x402`: no attestation capability; rejected per user requirement

### D3b: Pre-registration script for document registration

**Decision:** Document registration (registering the financial data with the Lemma oracle and generating the docHash) is done via a separate pre-registration script, not at runtime in the resource server. The script follows the pattern of `example-x402/scripts/register-with-full-content.ts`.

**Rationale:** Registering documents at runtime couples the server startup to the Lemma API, adds latency to the first request, and makes the server non-deterministic (the docHash changes on every registration). Pre-registration is a one-time setup step that produces a stable docHash. The resource server simply serves the pre-registered docHash in its responses.

**Flow:**
1. Developer runs `pnpm demo:register` (or `tsx scripts/register-with-full-content.ts`)
2. The script normalizes the financial data using the demo normalizer
3. The script registers the document with the Lemma oracle and receives a docHash
4. The docHash is written to a config file (e.g. `registered-docs.json`) or set as an environment variable
5. The resource server reads the pre-registered docHash and includes it in API responses

**Alternatives considered:**
- Runtime registration on first access: introduces non-determinism and couples server to Lemma API availability; rejected
- Hardcoded docHash: would require manual synchronization with the Lemma oracle; rejected for maintainability

### D4: Minimal Circom circuit and normalizer

**Decision:** Create simplified versions of `lemma/packages/agent/circuits` and `lemma/packages/agent/normalize` under `packages/demo/circuit` and `packages/demo/normalize`. The circuit is written in Circom (not raw Solidity), compiled via `circom` + `snarkjs` to produce a Groth16 verifier contract — matching the same toolchain used by the production circuits.

**Rationale:** The demo needs to show that financial data attestation can be verified with a ZK proof. Using Circom (like the production agent circuits) maintains tooling consistency. However, the circuit logic itself is trivially simple: a `Poseidon` hash of the financial data fields compared to the claimed docHash. The normalizer extracts and formats the relevant fields.

**Alternatives considered:**
- Reuse production circuit directly: too complex, requires full agent infrastructure; rejected for scope
- Raw Solidity circuit (no Circom): inconsistent with the project's existing Circom-based approach; rejected for tooling alignment
- No circuit at all: the attestation would be unverifiable; rejected — the whole point is proving the data

### D5: IdentityArtifact generation via interactive dialog

**Decision:** When the agent detects that no IdentityArtifact file exists, it pauses the demo flow and prompts the user to run `trust402 create` + `trust402 prove` (or offers to run them automatically).

**Rationale:** This mirrors the real Phase 1 / Phase 2 workflow from the SKILL.md. Generating the artifact requires a Lemma API key and takes 5–15 seconds (commit + prove + submit). Making it interactive ensures the user understands this is a one-time setup step.

**Alternatives considered:**
- Auto-generate without prompting: hides an important concept; rejected for educational value
- Pre-baked artifact file: would require shipping secrets; rejected for security

### D6: Composition order — proof-before-payment

**Decision:** Follow the exact composition from the SKILL.md:

```
paymentFetch(url)
  → wrapFetchWithPayment logic
    → proofFetch(url)       ← role proof generation happens here
      → native fetch(url)   ← only called if proof succeeds
```

**Rationale:** Proof-before-payment is the core Trust402 invariant. The demo must demonstrate this exact flow.

### D7: CLI entry points exempt from FP rules

**Decision:** The demo agent CLI entry point (`cli.ts`) follows the same FP exemption as `@trust402/cli` — Commander.js imperative patterns are acceptable.

**Rationale:** Interactive I/O (readline, spinner, typewriter effects) is inherently imperative. Forcing FP patterns here would harm readability without benefit. Internal logic modules will still follow FP rules where practical.

### D8: Attestation verification flow

**Decision:** After receiving the API response with `attestation` (docHash), the agent calls the Lemma API to retrieve the associated proof and verify that the financial data is authentic.

**Rationale:** This completes the full Trust402+Lemma story: (1) buyer proves identity and role, (2) buyer pays for access, (3) seller returns attested data, (4) buyer verifies the attestation. Without step 4, the demo only shows payment, not verification.

**Flow:**
1. Agent receives response: `{ revenue: ..., profit: ..., attestation: "0x..." }`
2. Agent calls `lemmaClient.verifyAttestation(docHash)` or equivalent
3. Agent displays: "Attestation verified ✓ — this financial data is certified by [issuer]"

## Risks / Trade-offs

- **[Build complexity]** Adding Rust/Foundry to the demo increases setup friction → Provide clear prerequisites and a `setup.sh` script; consider pre-built WASM artifacts in the repo
- **[Network dependency]** The demo requires Lemma API, x402 facilitator, and Base Sepolia → Document required environment variables and provide clear error messages when services are unavailable
- **[Proof latency]** Each role proof takes 2–5 seconds via the Relay prover → Use ora spinners with descriptive text; do not attempt to hide latency
- **[Wallet funding]** The agent wallet needs Base Sepolia USDC → Print a faucet link at startup if the balance is zero
- **[Circuit deployment]** The demo circuit must be deployed to Base Sepolia → Include deployment script and document the one-time setup; consider pre-deployed addresses for convenience
- **[Demo stability]** External service outages can break the demo → Accepted; the demo is not designed for CI, it's a human-facing demonstration
