---
name: trust402-prove-role
description: Enforce ZK role-proof before x402 autonomous payments. Use when an AI agent needs to make an x402 payment — the agent must generate both an identity proof and a role-spend-limit proof first, then attach them to the payment request headers.
---

# Prove Role Before Payment

Every x402 payment this agent makes MUST be preceded by two ZK proofs:
1. An **identity proof** (agent-identity-v1) proving the credential is valid and issued by a trusted authority
2. A **role-spend-limit proof** (role-spend-limit-v1) proving the agent holds the required role and is within the spend ceiling

No proof = no payment. This is non-negotiable.

## Payment Protocol

```
Progress:
- [ ] Load credential
- [ ] Commit credential (identity)
- [ ] Generate identity proof (π₁)
- [ ] Build role witness
- [ ] Generate role proof (π₂)
- [ ] Attach proofs to x402 headers
- [ ] Send payment
```

## Step 1: Load credential

Read the agent's credential from the configured source (env var, file, or Lemma SDK).
The credential must conform to `AgentCredential` from `@trust402/identity`.

Required fields the credential MUST contain:
- `authority.roles` — at least one role matching the payment gate
- `financial.spendLimit` — a number within the gate ceiling
- `lifecycle.revoked` — must be `false` or absent

If any field is missing or the credential is revoked, **stop**. Do not proceed to payment.

## Step 2: Commit credential (identity)

```typescript
import { commit } from "@trust402/identity";

const commitResult = await commit(client, credential);
// commitResult.root = credentialCommitment (used in both proofs)
// commitResult.salt = binding randomness
```

## Step 3: Generate identity proof (π₁)

```typescript
import { prove as proveIdentity } from "@trust402/identity";

const identityProof = await proveIdentity(client, commitResult);
// identityProof.inputs[0] = credentialCommitment
```

If proof generation fails, **stop**. Do not proceed to payment.

## Step 4: Build role witness

```typescript
import { witness, type PaymentGate } from "@trust402/roles";

const gate: PaymentGate = { role: "purchaser", maxSpend: 10000 }; // USD cents
const circuitWitness = witness(credential, gate, commitResult);
// circuitWitness.credentialCommitment = commitResult.root
// circuitWitness.credentialCommitmentPublic = commitResult.root (same value)
// circuitWitness.roleGateCommitment = Poseidon4(commitment, roleHash, spendLimit, salt)
```

## Step 5: Generate role proof (π₂)

```typescript
import { prove as proveRole } from "@trust402/roles";

const roleProof = await proveRole(client, circuitWitness);
// roleProof.inputs = [requiredRoleHash, maxSpend, nowSec, roleGateCommitment, credentialCommitmentPublic]
```

If proof generation fails, **stop**. Do not proceed to payment.

## Step 6: Attach proofs to x402 headers

Add both proofs to the x402 payment request as HTTP headers:

```
X-Lemma-Identity-Proof: <identityProof.proof>
X-Lemma-Identity-Inputs: <identityProof.inputs.join(",")>
X-Lemma-Identity-Circuit-Id: agent-identity-v1

X-Lemma-Role-Proof: <roleProof.proof>
X-Lemma-Role-Inputs: <roleProof.inputs.join(",")>
X-Lemma-Role-Circuit-Id: role-spend-limit-v1
```

## Step 7: Send payment

Only after steps 1-6 complete successfully, send the x402 payment request
with both proof headers attached.

## What the server checks

The receiving x402 resource server verifies:

1. Identity proof headers are present
2. The identity proof is a valid Groth16 proof for circuit `agent-identity-v1`
3. Role proof headers are present
4. The role proof is a valid Groth16 proof for circuit `role-spend-limit-v1`
5. **Cross-proof correlation**: `identityProof.inputs[0] === roleProof.inputs[4]`
   (credentialCommitment matches between both proofs)
6. Role proof public inputs match the gate's `requiredRoleHash` and `maxSpend`

If any check fails, the server returns 402 and the payment is rejected.

## Edge Cases

### Spend limit equals gate ceiling (valid)
When the agent's `spendLimit` exactly equals the gate's `maxSpend`, the circuit accepts this as valid. The `LessEqThan(128)` constraint enforces `spendLimit <= maxSpend` (less-than-or-equal, not strictly less-than).

### Agent holds multiple roles
The witness builder hashes **only the specific role required by the gate**, not all roles in the credential. When building a witness for gate `{ role: "purchaser", maxSpend: 10000 }`, the builder hashes `"purchaser"` regardless of what other roles the agent holds.

### Gate ceiling is zero
A gate with `maxSpend: 0` only allows agents with `spendLimit: 0` to prove authority. This effectively creates a read-only role — the agent can prove it holds the role but cannot spend any money.

### Spend limit field is absent
If the credential's `financial.spendLimit` is missing, the witness builder defaults it to `0`. The agent can only pass gates with `maxSpend: 0`.

### CredentialCommitment mismatch between proofs
Both proofs MUST reference the same `credentialCommitment`. The identity proof exposes it as `inputs[0]`; the role proof exposes it as `inputs[4]` (`credentialCommitmentPublic`). If they don't match, the server rejects the payment.

### Proof generation fails mid-flow
If proof generation fails at any step (witness build error, SDK failure, network error), the protocol **halts immediately**. No payment request is sent. The agent must resolve the error before retrying.
