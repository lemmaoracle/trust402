#!/usr/bin/env node
/**
 * Trust402 Demo Agent — CLI entry point.
 *
 * 9-phase interactive demo:
 *   0. Resource startup note
 *   1. Agent startup with SKILL.md + keypress gate
 *   2. Identity generation + budget table + keypress gate
 *   3. First query typewriter + keypress gate
 *   4. AI reasoning simulation with keypress gates between stages
 *   5. x402 response with spinner (first payment)
 *   6. Proof-gated payment with spinner (second payment — budget enforcement)
 *   7. Attestation verification
 *   8. Proof summary with blockchain events + keypress gate
 */

import { config } from "dotenv";
import * as path from "node:path";
import chalk from "chalk";
import { validateEnv } from "./env.js";
import { displaySkillSummary } from "./skill-loader.js";
import { displayQuery, runReasoningSimulation } from "./reasoning.js";
import { loadOrPromptArtifact } from "./artifact.js";
import { executeProofGatedPayment, type ApiResponse } from "./payment.js";
import { verifyAttestation, queryBlockchainEvents, type BlockchainEvent } from "./attestation.js";
import { displaySummary } from "./summary.js";
import { waitForKeypress, typewriter, asyncSpinner } from "./tui.js";

config({ path: path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env") });

const formatUsd = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

const main = async (): Promise<void> => {
  // ── Phase 0: Resource startup note ──────────────────────────────
  console.log(chalk.bold.blue("\n🤖 Trust402 Demo Agent\n"));
  await typewriter("This demo simulates an AI agent paying for verified financial data using ZK proofs and the x402 protocol.", { delay: 20 });

  // ── Validate environment ────────────────────────────────────────
  const env = validateEnv();

  console.log(chalk.dim(`\n  Resource server: ${env.resourceUrl}`));

  // ── Phase 1: Agent startup with SKILL.md ───────────────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 1: Agent Startup ━━━\n"));
  displaySkillSummary();
  await waitForKeypress("Continue to identity setup");

  // ── Phase 2: Identity generation + budget table ─────────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 2: Identity & Budget ━━━\n"));
  const artifact = await loadOrPromptArtifact(env);

  // ── MAX_SPEND threshold warning (task 4.4) ─────────────────────
  const maxSpendHigh = env.maxSpend >= 50000;
  maxSpendHigh
    ? console.log(chalk.yellow(`\n⚠️  Warning: MAX_SPEND is ${formatUsd(env.maxSpend)} — the $500 payment may succeed instead of demonstrating budget enforcement. Set MAX_SPEND < 50000 (e.g., 1000 = $10.00) for the intended demo flow.\n`))
    : undefined;

  // ── Phase 3: First query (typewriter) ───────────────────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 3: User Query ━━━\n"));
  await displayQuery(1);
  await waitForKeypress("Continue to AI reasoning");

  // ── Phase 4: AI reasoning simulation ────────────────────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 4: AI Reasoning ━━━\n"));
  await runReasoningSimulation(1);

  // ── Phase 5: First payment — successful $0.01 ──────────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 5: x402 Payment ($0.01) ━━━\n"));
  await waitForKeypress("Execute first payment");

  const url1 = `${env.resourceUrl}/ir/2026q1`;
  const payment1Result = await executeProofGatedPayment(env, artifact, url1, "GET");

  payment1Result.success
    ? console.log(chalk.green("\n✓ First payment successful: $0.01 USDC for GET /ir/2026q1\n"))
    : console.log(chalk.red(`\n✗ First payment failed: ${payment1Result.error ?? "unknown error"}\n`));

  // ── Phase 7: Attestation verification (only for first payment) ──
  console.log(chalk.bold.cyan("\n━━━ Phase 7: Attestation Verification ━━━\n"));

  const firstPaymentData = payment1Result.success ? payment1Result.data as ApiResponse : null;

  const attestationResult = firstPaymentData && !R_isNil(firstPaymentData.attestation)
    ? await verifyAttestation(env, firstPaymentData)
    : { docHash: "none", verified: false, error: "No data from first payment" };

  // ── Phase 6: Second payment — budget enforcement ───────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 6: Budget Enforcement ($500) ━━━\n"));

  await typewriter("Agent requests the corporate contract — a $500 purchase...", { delay: 30 });
  await displayQuery(2);
  await runReasoningSimulation(2);
  await waitForKeypress("Attempt second payment");

  const url2 = `${env.resourceUrl}/contract`;
  const payment2Result = await executeProofGatedPayment(env, artifact, url2, "POST");

  payment2Result.success
    ? console.log(chalk.yellow(`\n⚠️  Second payment succeeded unexpectedly — budget not enforced. MAX_SPEND may be too high.\n`))
    : console.log(chalk.red(`\n✗ Second payment rejected: Budget exceeded: $500.00 > ${formatUsd(env.maxSpend)} spend limit\n`));

  // ── Phase 8: Proof summary with blockchain events ───────────────
  console.log(chalk.bold.cyan("\n━━━ Phase 8: Transaction Summary ━━━\n"));

  const blockchainEvents = await asyncSpinner(
    "Querying blockchain events...",
    async () => queryBlockchainEvents(env.baseSepoliaRpcUrl, artifact.docHash),
  ).catch(() => [] as ReadonlyArray<BlockchainEvent>);

  await displaySummary(env, firstPaymentData, attestationResult, payment1Result, payment2Result, blockchainEvents);
};

// Minimal R.isNil-like check without importing ramda in cli.ts
const R_isNil = (val: unknown): val is null | undefined =>
  val === null || val === undefined;

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`\n✗ Fatal error: ${message}`));
  process.exit(1);
});
