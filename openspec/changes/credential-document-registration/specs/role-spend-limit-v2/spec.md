## MODIFIED Requirements

### Requirement: Circuit registration for role-spend-limit-v2

The system SHALL provide an updated registration script that uploads circuit artifacts to IPFS via Pinata and registers circuit metadata with the Lemma oracle using `circuits.register` with circuit ID `role-spend-limit-v2`. The registration script SHALL read the verifier address from the `ROLES_VERIFIER_ADDRESS` environment variable instead of `VERIFIER_ADDRESS`. Before submitting proofs, the document SHALL be registered in the oracle via `encrypt()` → `documents.register()`.

#### Scenario: Prove-role-from-artifact registers document before submitting proofs

- **WHEN** `proveRoleFromArtifact()` is called with an artifact and a gate
- **THEN** it SHALL register the credential document via `encrypt()` → `documents.register()` before calling `proofs.submit()` for both identity and role proofs

#### Scenario: docHash from encrypt is used for proof submission

- **WHEN** a document is registered and a proof is generated
- **THEN** `proofs.submit()` SHALL receive the `docHash` from the `encrypt()` output, not from `commitOutput.root`
