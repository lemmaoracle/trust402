## ADDED Requirements

### Requirement: wrapFetchWithProof function

The system SHALL provide a `wrapFetchWithProof` function that accepts a base `fetch`, an `AgentCredential`, a `PaymentGate`, and a `LemmaClient`, and returns a new `fetch`-compatible function that enforces the proof-before-payment protocol by generating identity and role proofs before each request.

#### Scenario: Successful proof-then-fetch

- **WHEN** `wrapFetchWithProof(fetch, credential, gate, lemmaClient)` is called and the returned fetch is invoked with a URL
- **THEN** the function generates an identity proof (π₁) via `commit → prove(agent-identity-v1)`, builds a role witness via `witness(credential, gate, commitOutput)`, generates a role proof (π₂) via `prove(role-spend-limit-v2)`, submits both proofs to the oracle, and calls the base fetch only after all steps succeed

#### Scenario: Identity proof generation failure blocks fetch

- **WHEN** the identity proof generation fails during `wrapFetchWithProof`
- **THEN** the function SHALL return `Promise.reject(new Error(...))` and no HTTP request SHALL be sent

#### Scenario: Role proof generation failure blocks fetch

- **WHEN** the role witness or proof generation fails during `wrapFetchWithProof`
- **THEN** the function SHALL return `Promise.reject(new Error(...))` and no HTTP request SHALL be sent

#### Scenario: Oracle submission failure does not block fetch

- **WHEN** proof generation succeeds but oracle submission fails during `wrapFetchWithProof`
- **THEN** the function SHALL log a warning and proceed to call the base fetch, as the proofs themselves are valid regardless of oracle recording

#### Scenario: Preserves existing request init

- **WHEN** `wrapFetchWithProof` is called and the returned fetch is invoked with a `RequestInit`
- **THEN** the `RequestInit` SHALL be passed through unchanged to the base fetch

#### Scenario: Composable with wrapFetchWithPayment

- **WHEN** `wrapFetchWithProof` wraps a fetch that has already been wrapped by `wrapFetchWithPayment` from `@x402/fetch`
- **THEN** the combined fetch SHALL first enforce proof generation (via `wrapFetchWithProof`) and then handle x402 payment (via `wrapFetchWithPayment`), blocking unauthorized payments at the proof step

### Requirement: proveAndSubmit function

The system SHALL provide a `proveAndSubmit` function that accepts a `LemmaClient`, an `AgentCredential`, and a `PaymentGate`, and returns a `Promise<ProveAndSubmitResult>` containing both proof results and submission results, without making any HTTP fetch request.

#### Scenario: Successful prove and submit

- **WHEN** `proveAndSubmit(client, credential, gate)` is called with a valid credential and matching gate
- **THEN** the function generates an identity proof via `commit → prove(agent-identity-v1)`, builds a role witness via `witness(credential, gate, commitOutput)`, generates a role proof via `prove(role-spend-limit-v2)`, submits both proofs to the oracle, and returns `{ commitOutput, identityProof, roleProof, identitySubmission, roleSubmission }`

#### Scenario: Identity proof failure

- **WHEN** the identity proof generation fails during `proveAndSubmit`
- **THEN** the function SHALL return `Promise.reject(new Error(...))`

#### Scenario: Role proof failure

- **WHEN** the role witness or proof generation fails during `proveAndSubmit`
- **THEN** the function SHALL return `Promise.reject(new Error(...))`

### Requirement: ProveAndSubmitResult type

The system SHALL define a `ProveAndSubmitResult` type containing `commitOutput` (CommitOutput), `identityProof` (ProveOutput), `roleProof` (ProveOutput), `identitySubmission` (unknown, oracle response), and `roleSubmission` (unknown, oracle response).

#### Scenario: Type contains all proof and submission data

- **WHEN** a `ProveAndSubmitResult` is returned from `proveAndSubmit`
- **THEN** all five fields are present and correctly typed

### Requirement: PaymentGate re-export

The system SHALL re-export the `PaymentGate` type from `@trust402/roles` for convenience.

#### Scenario: PaymentGate is importable from @trust402/protocol

- **WHEN** `PaymentGate` is imported from `@trust402/protocol`
- **THEN** it is the same type as `PaymentGate` from `@trust402/roles`
