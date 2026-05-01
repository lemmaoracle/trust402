/**
 * @trust402/demo-agent — Demo CLI that simulates an AI agent
 * using Trust402 ZK proofs to pay for a verified data API.
 */

export { validateEnv, type EnvConfig } from "./env.js";
export { displaySkillSummary } from "./skill-loader.js";
export { displayQuery, runReasoningSimulation } from "./reasoning.js";
export { loadOrPromptArtifact } from "./artifact.js";
export { executeProofGatedPayment, type ApiResponse } from "./payment.js";
export { verifyAttestation, type AttestationResult } from "./attestation.js";
export { displaySummary } from "./summary.js";
