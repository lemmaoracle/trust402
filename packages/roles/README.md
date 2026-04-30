# @trust402/roles

ZK role-enforcement circuits for autonomous agent payments.

Proves that an AI agent holds a required role **and** its spend limit falls within a payment gate ceiling — before the agent can settle an x402 payment.

Built on [Lemma](https://github.com/lemmaoracle/lemma) — all cryptographic operations delegate to `@lemmaoracle/sdk` and `@lemmaoracle/agent`.

## API Surface

### `commit(client, credential)` — Poseidon Commitment

Re-exported from `@lemmaoracle/agent`. Normalizes the credential via the SDK and computes a sectioned Poseidon6 commitment matching the `agent-identity-v1` circuit.

```typescript
import { commit } from "@trust402/roles";

const commitOutput = await commit(client, credential);
// commitOutput.root           — credentialCommitment
// commitOutput.sectionHashes  — { identityHash, authorityHash, financialHash, lifecycleHash, provenanceHash }
// commitOutput.salt           — binding salt
```

### `computeCredentialCommitment(normalized, salt?)` — Pure Commitment

Re-exported from `@lemmaoracle/agent`. Computes the Poseidon commitment from an already-normalized credential without network access.

### `prove(client, commitOutput)` — Generate Proof

Generates a ZK proof against the `agent-identity-v1` circuit using the commitment output.

```typescript
import { prove } from "@trust402/roles";

const proofResult = await prove(client, commitOutput);
```

### `submit(client, docHash, proofResult)` — Submit Proof

Submits the proof to the Lemma oracle for on-chain recording.

```typescript
import { submit } from "@trust402/roles";

await submit(client, commitOutput.root, proofResult);
```

### `connect(apiBase)` — Client Factory

Curried factory for creating a Lemma client.

```typescript
import { connect } from "@trust402/roles";

const client = connect("https://workers.lemma.workers.dev")("your-api-key");
```

## Re-exported Types

All credential types are re-exported from `@lemmaoracle/agent`:

```typescript
import type {
  AgentCredential,
  AgentCredentialInput,
  NormalizedAgentCredential,
  ValidationResult,
  CommitOutput,
  SectionedCommitResult,
  ValidationError,
  ValidationErrorKind,
  CredentialOptions,
  PaymentGate,
} from "@trust402/roles";
```

## CLI: `trust402-agent`

A command-line tool for creating, validating, and proving agent identity credentials.

### `create` — Build a validated credential

```bash
# Minimal (required fields only)
trust402-agent create \
  --agent-id agent-1 \
  --subject-id did:lemma:agent:1 \
  --roles purchaser,viewer \
  --issuer-id did:lemma:org:trust-anchor

# With optional fields
trust402-agent create \
  --agent-id agent-1 \
  --subject-id did:lemma:agent:1 \
  --roles purchaser \
  --issuer-id did:lemma:org:trust-anchor \
  --org-id acme \
  --controller-id did:lemma:org:acme \
  --spend-limit 50000 \
  --currency USD \
  --scopes procurement,reporting \
  --expires-at 1777436000 \
  --source-system ldap \
  --generator-id trust-anchor \
  --chain-id 1 \
  --network mainnet

# Pipe to file
trust402-agent create --agent-id agent-1 --subject-id subject-1 --roles admin --issuer-id issuer-1 > credential.json
```

### `validate` — Check a credential file

```bash
# Valid credential
trust402-agent validate credential.json
# Output: Valid

# Invalid credential
trust402-agent validate invalid.json
# Output: errors to stderr, exit code 1
```

### `prove` — Commit, prove, and submit

```bash
# Full pipeline
trust402-agent prove --credential credential.json --api-key $LEMMA_API_KEY

# Dry-run (skip submission)
trust402-agent prove --credential credential.json --api-key $LEMMA_API_KEY --dry-run
```

Output is structured JSON:

```json
{
  "commit": { "root": "...", "sectionHashes": { ... }, "salt": "..." },
  "proof": { "proof": "...", "inputs": ["..."] },
  "submission": { "txHash": "...", "status": "submitted" }
}
```

## Migration Note (v0.0.1 → v0.0.2)

**Breaking change**: The SHA-256-based `witness()` function and `CircuitWitness` type have been replaced by a Poseidon-based `commit()` → `prove()` → `submit()` flow. The `CIRCUIT_ID` changed from `"role-spend-limit-v1"` to `"agent-identity-v1"`.

| Before (v0.0.1) | After (v0.0.2) |
|---|---|
| `witness(cred, gate)` | `commit(client, cred)` |
| `CircuitWitness` | `CommitOutput` |
| `prove(client, witness)` | `prove(client, commitOutput)` |
| `CIRCUIT_ID = "role-spend-limit-v1"` | `CIRCUIT_ID = "agent-identity-v1"` |
| SHA-256 field hashes | Poseidon6 section hashes |

The new flow uses sectioned Poseidon6 commitments from `@lemmaoracle/agent`, which are compatible with the `agent-identity-v1` circuit and `proofs.submit()` from `@lemmaoracle/sdk`.

## Build

```bash
# Build the TypeScript package
cd packages/roles && pnpm build

# Run tests
pnpm test

# Type-check
pnpm type-check
```

## Registration

Register the circuit and schema with the Lemma oracle (requires API keys):

```bash
export LEMMA_API_KEY=your-key
export PINATA_API_KEY=your-pinata-key
export PINATA_SECRET_API_KEY=your-pinata-secret

# Register schema and circuit
pnpm register
```

## Requirements

- Node.js >= 20
- `@lemmaoracle/sdk` ^0.0.23
- `@lemmaoracle/agent` ^0.0.23

## License

MIT
