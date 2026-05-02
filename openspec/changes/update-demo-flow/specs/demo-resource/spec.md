## ADDED Requirements

### Requirement: High-value contract POST endpoint (x402)
The system SHALL expose a `POST /contract` endpoint gated behind the same Lemma-augmented x402 middleware as the existing `GET /ir/:reportId` endpoint. The endpoint SHALL require $500 USDC payment on Base Sepolia (eip155:84532) and return a JSON response with an `attestation` docHash field.

#### Scenario: POST /contract registration in x402 routes
- **WHEN** the server starts with `PAY_TO_ADDRESS=0xABC...`
- **THEN** `POST /contract` is registered with price `$500`, network `eip155:84532`, scheme `exact`, and `extensions: { lemma: {} }`

#### Scenario: Paid POST /contract returns contract data
- **WHEN** a client sends `POST /contract` with a valid $500 USDC x402 payment
- **THEN** the system returns HTTP 200 with `{ type: "contract", description: "...", vendor: "Example Corp", price: "$500", currency: "USDC", period: "Full History", attestation: "0x..." }`

### Requirement: Mock contract data
The system SHALL return hardcoded contract data for `POST /contract`: a $500 million-dollar master service agreement for Example Corp's full historical financial data. The pre-registered docHash SHALL be loaded from `registered-docs.json` under the key `"contract"`.

#### Scenario: Contract data with attestation
- **WHEN** a paid `POST /contract` request is received and `registered-docs.json` contains `{ "contract": "0xabc..." }`
- **THEN** the response includes `attestation: "0xabc..."` and `price: "$500"`
