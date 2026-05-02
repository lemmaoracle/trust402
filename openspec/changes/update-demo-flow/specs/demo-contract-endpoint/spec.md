## ADDED Requirements

### Requirement: High-value contract endpoint
The system SHALL expose a `POST /contract` endpoint on the demo resource server that simulates a high-value corporate contract API. The endpoint SHALL be priced at $500 USDC on Base Sepolia (eip155:84532). The response SHALL include a `docHash` attestation like the existing `GET /ir/:reportId` endpoint.

#### Scenario: Payment required for contract endpoint
- **WHEN** a client sends `POST /contract` without a valid x402 payment
- **THEN** the system returns HTTP 402 with payment details indicating $500 USDC

#### Scenario: Successful contract fetch after payment
- **WHEN** a client sends `POST /contract` with a valid $500 USDC x402 payment
- **THEN** the system returns HTTP 200 with JSON containing contract data and `attestation` field

### Requirement: Contract endpoint data
The `POST /contract` endpoint SHALL return a JSON body containing: `{ type: "contract", description: string, vendor: "Example Corp", price: "$500", currency: "USDC", period: "Full History", attestation: string }`.

#### Scenario: Contract data structure
- **WHEN** a paid `POST /contract` request is received
- **THEN** the response follows the specified contract data structure with `price: "$500"` (matching the x402 dollar-denominated price format), `period: "Full History"`, and the pre-registered `attestation` docHash

### Requirement: Contract endpoint x402 configuration
The contract endpoint SHALL be configured in the x402 routes alongside the existing `GET /ir/:reportId` endpoint, using the same `payTo` address and `ExactEvmScheme`. The route declaration SHALL use `$500` as the price string.

#### Scenario: x402 route registration
- **WHEN** the resource server starts with a valid `PAY_TO_ADDRESS`
- **THEN** both `GET /ir/:reportId` at $0.01 and `POST /contract` at $500 are registered as x402-protected routes
