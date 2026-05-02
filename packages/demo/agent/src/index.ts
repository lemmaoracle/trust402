/**
 * @trust402/demo-agent — Demo CLI that simulates an AI agent
 * using Trust402 ZK proofs to pay for a verified data API.
 */

export { validateEnv, type EnvConfig } from "./env.js";
export { displaySkillSummary } from "./skill-loader.js";
export { displayQuery, runReasoningSimulation } from "./reasoning.js";
export { loadOrPromptArtifact } from "./artifact.js";
export { executeProofGatedPayment, type ApiResponse, type ContractResponse, type PaymentResult } from "./payment.js";
export { verifyAttestation, queryDocumentRegistered, queryProofSettled, queryBlockchainEvents, displayBlockchainEvents, type AttestationResult, type BlockchainEvent } from "./attestation.js";
export { displaySummary } from "./summary.js";
export { waitForKeypress, typewriter, asyncSpinner } from "./tui.js";
