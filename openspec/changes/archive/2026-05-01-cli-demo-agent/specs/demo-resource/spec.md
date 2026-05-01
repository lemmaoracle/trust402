## ADDED Requirements

### Requirement: Corporate IR financial data endpoint
The system SHALL expose a `GET /ir/:reportId` endpoint that returns JSON financial data for the given report. The response SHALL contain `reportId`, `company`, `period`, `revenue` (USD), `profit` (USD), and `attestation` (bytes32 hex string — the docHash linking to the Lemma proof of this data, pre-registered via the registration script).

#### Scenario: Successful IR data fetch after payment
- **WHEN** a client sends `GET /ir/2026q1` with a valid x402 payment
- **THEN** the system returns HTTP 200 with JSON `{ reportId: "2026q1", company: "Example Corp", period: "2026-Q1", revenue: 1250000000, profit: 340000000, attestation: "0x..." }`

#### Scenario: Request without payment
- **WHEN** a client sends `GET /ir/2026q1` without a valid x402 payment
- **THEN** the system returns the x402 payment-required response (HTTP 402) with payment details

### Requirement: Lemma-augmented x402 middleware
The system SHALL use `@lemmaoracle/x402` (following the pattern from `example-x402/packages/worker/src/index.ts:17-23`) to gate the `/ir/:reportId` endpoint behind a $0.01 USDC payment on Base Sepolia (eip155:84532) AND include a pre-registered `docHash` attestation in the response. The `payTo` address SHALL be configurable via the `PAY_TO_ADDRESS` environment variable.

#### Scenario: Payment and attestation configuration
- **WHEN** the server starts with `PAY_TO_ADDRESS=0xABC...`, `FACILITATOR_URL=...`, and pre-registered docHashes loaded from `registered-docs.json`
- **THEN** the x402 payment middleware is configured to accept $0.01 USDC payments AND the response includes the pre-registered `docHash` attestation verifiable via the Lemma oracle

### Requirement: Pre-registered docHash loading
The system SHALL load pre-registered docHashes from a `registered-docs.json` file (produced by the `register-with-full-content` script). The file maps report IDs to their docHash attestation values. The resource server SHALL NOT register documents with the Lemma oracle at runtime.

#### Scenario: Pre-registered docHash served
- **WHEN** a paid request to `GET /ir/2026q1` is received and `registered-docs.json` contains `{ "2026q1": "0xabc..." }`
- **THEN** the response includes `attestation: "0xabc..."`

#### Scenario: Missing docHash for report
- **WHEN** a paid request to `GET /ir/2026q1` is received but `registered-docs.json` has no entry for `2026q1`
- **THEN** the response includes `attestation: null` and a warning header `X-Attestation-Warning: not-registered`

### Requirement: Health check endpoint
The system SHALL expose a `GET /` endpoint that returns a JSON health check response with `status: "ok"` and `service: "trust402-demo-resource"`.

#### Scenario: Health check
- **WHEN** a client sends `GET /`
- **THEN** the system returns HTTP 200 with `{ status: "ok", service: "trust402-demo-resource" }`

### Requirement: Server startup
The system SHALL start an HTTP server using Hono on a configurable port (default 3001). The port SHALL be set via the `PORT` environment variable.

#### Scenario: Default port
- **WHEN** the server starts without `PORT` set
- **THEN** it listens on port 3001

### Requirement: Mock financial data
The system SHALL serve hardcoded financial data for known report IDs. At minimum, `2026q1` SHALL return Example Corp Q1 2026 data. Unknown report IDs SHALL return 404.

#### Scenario: Known report
- **WHEN** a client requests `GET /ir/2026q1`
- **THEN** the system returns Example Corp Q1 2026 financial data

#### Scenario: Unknown report
- **WHEN** a client requests `GET /ir/unknown`
- **THEN** the system returns HTTP 404 with `{ error: "Report not found" }`

## ADDED Requirements — Registration Script

### Requirement: Document pre-registration script
The system SHALL provide a `scripts/register-with-full-content.ts` script (following the pattern of `example-x402/scripts/register-with-full-content.ts`) that registers financial data documents with the Lemma oracle and produces a `registered-docs.json` file mapping report IDs to docHash values.

#### Scenario: Register a report
- **WHEN** the script is run with `LEMMA_API_KEY` set and a report ID argument (e.g. `2026q1`)
- **THEN** it normalizes the financial data using the demo normalizer, registers the document with the Lemma oracle, and writes the resulting docHash to `registered-docs.json`

#### Scenario: Register all known reports
- **WHEN** the script is run without a report ID argument
- **THEN** it registers all hardcoded financial reports and writes all docHashes to `registered-docs.json`
