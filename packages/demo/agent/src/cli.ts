#!/usr/bin/env node
/**
 * Trust402 Demo Agent — CLI entry point.
 *
 * Simulates an AI agent using ZK proofs to pay for a verified data API.
 *
 * Flow:
 *   1. Validate environment variables
 *   2. Load and display SKILL.md summary
 *   3. Display hardcoded user query
 *   4. Simulate AI reasoning (4 stages)
 *   5. Load or prompt for IdentityArtifact
 *   6. Execute proof-gated payment
 *   7. Verify attestation via Lemma oracle
 *   8. Display transaction summary
 */

import { config } from "dotenv";
import * as path from "node:path";
import chalk from "chalk";
import { validateEnv } from "./env.js";
import { displaySkillSummary } from "./skill-loader.js";
import { displayQuery, runReasoningSimulation } from "./reasoning.js";
import { loadOrPromptArtifact } from "./artifact.js";
import { executeProofGatedPayment } from "./payment.js";
import { verifyAttestation } from "./attestation.js";
import { displaySummary } from "./summary.js";

config({ path: path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env") });

const main = async (): Promise<void> => {
  console.log(chalk.bold.blue("\n🤖 Trust402 Demo Agent\n"));
  console.log("This demo simulates an AI agent paying for verified financial data\nusing ZK proofs and the x402 protocol.\n");

  // 1. Validate environment
  const env = validateEnv();

  // 2. Display SKILL.md summary
  displaySkillSummary();

  // 3. Display hardcoded query
  displayQuery();

  // 4. AI reasoning simulation
  await runReasoningSimulation();

  // 5. Load or prompt for IdentityArtifact
  const artifact = await loadOrPromptArtifact(env);

  // 6. Execute proof-gated payment
  const { data } = await executeProofGatedPayment(env, artifact);

  // 7. Verify attestation
  const attestationResult = await verifyAttestation(env, data);

  // 8. Display summary
  displaySummary(env, data, attestationResult);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\n✗ Fatal error: ${message}`));
  process.exit(1);
});
