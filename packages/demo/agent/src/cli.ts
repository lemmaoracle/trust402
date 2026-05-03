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
import figlet from "figlet";
import { validateEnv } from "./env.js";
import { resolveEnsNames } from "./ens.js";
import { displaySkillSummary } from "./skill-loader.js";
import { displayQuery, runReasoningSimulation } from "./reasoning.js";
import { loadOrPromptArtifact } from "./artifact.js";
import { executeProofGatedPayment, type ApiResponse } from "./payment.js";
import { verifyAttestation, queryBlockchainEvents, type BlockchainEvent } from "./attestation.js";
import { displaySummary } from "./summary.js";
import { waitForKeypress, asyncSpinner, displayPhaseBanner, printStateChange, serializeTruncated } from "./tui.js";
import { witness } from "@trust402/roles";
import type { PaymentGate } from "@trust402/roles";
import type { ProveRoleResult } from "@trust402/protocol";

config({ path: path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env") });

const formatUsd = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

const buildPaymentGate = (maxSpend: number): PaymentGate => ({
  role: "purchaser",
  maxSpend,
});

const formatCondition = (maxSpend: number, price: string, ok: boolean): string =>
  `^-role^:=^cpurchaser^:, ^-spendLimit^:=^c${formatUsd(maxSpend)}^:, ^-price^:=^g${price}^: → ${ok ? "^bOK" : "^rNG"}`;

const formatWitness = (gate: PaymentGate, commitOutput: unknown): string =>
  Object.entries(witness(gate, commitOutput as never))
    .map(([key, value]) => `^-${key}^:: ${value}`)
    .join("\n");

const main = async (): Promise<void> => {
  // ── Phase 0: Resource startup note ──────────────────────────────
  const banner = figlet.textSync("Trust402", { font: "5 Line Oblique" });
  console.log(chalk.bold.cyan(banner));
  console.log(chalk.dim("  AI agent demo — zk-proven payments for verified data via x402\n"));

  // ── Validate environment ────────────────────────────────────────
  let env = validateEnv();

  // ── Resolve ENS names to Ethereum addresses ────────────────────
  env = await resolveEnsNames(env);

  console.log(chalk.dim(`\n  Resource server: ${env.resourceUrl}`));
  await waitForKeypress("Continue to agent startup");

  // ── Phase 1: Agent startup with SKILL.md ───────────────────────
  displayPhaseBanner("Phase 1: Agent Startup", "cyan");
  await displaySkillSummary();
  await waitForKeypress("Continue to identity setup");

  // ── Phase 2: Identity generation + budget table ─────────────────
  displayPhaseBanner("Phase 2: <TRUST402> Identity & Budget", "greenBright");
  const artifact = await loadOrPromptArtifact(env);

  // ── MAX_SPEND threshold warning (task 4.4) ─────────────────────
  const maxSpendHigh = env.maxSpend >= 50000;
  maxSpendHigh
    ? console.log(chalk.yellow(`\n  ⚠️  Warning: MAX_SPEND is ${formatUsd(env.maxSpend)} — the $500 payment may succeed instead of demonstrating budget enforcement. Set MAX_SPEND < 50000 (e.g., 1000 = $10.00) for the intended demo flow.\n`))
    : undefined;

  // ── Phase 3: First query (typewriter) ───────────────────────────
  displayPhaseBanner("Phase 3: User Query", "cyan");
  await displayQuery(1);
  await waitForKeypress("Continue to AI reasoning");

  // ── Phase 4: AI reasoning simulation ────────────────────────────
  displayPhaseBanner("Phase 4: AI Reasoning", "cyan");
  await runReasoningSimulation(1);

  // ── Phase 5: First payment — successful $0.01 ──────────────────
  displayPhaseBanner("Phase 5: <TRUST402> Payment ($0.01)", "greenBright");

  const url1 = `${env.resourceUrl}/ir/2026q1`;
  const gate1 = buildPaymentGate(env.maxSpend);
  let proofResult1: ProveRoleResult | undefined;
  const payment1Result = await executeProofGatedPayment(
    env, artifact, url1, "GET",
    (result) => { proofResult1 = result; },
  );

  const payment1Witness = formatWitness(gate1, artifact.commitOutput);

  if (payment1Result.success) {
    console.log(chalk.green("\n  ✓ First payment successful: $0.01 USDC for GET /ir/2026q1"));
    const data = payment1Result.data as ApiResponse | undefined;
    const summaryJson = data && typeof data === "object"
      ? JSON.stringify(data, null, 2)
      : "-";
    await printStateChange("Proof of Solvency Submitted, Payment Completed", [
      { label: "Condition", value: formatCondition(env.maxSpend, "$0.01", true) },
      { label: "Witness", value: payment1Witness },
      { label: "Proof", value: serializeTruncated(proofResult1?.roleProof) },
      { label: "Content", value: summaryJson },
    ]);
  } else {
    console.log(chalk.red(`\n  ✗ First payment failed: ${payment1Result.error ?? "unknown error"}\n`));
  }

  // ── Phase 6: Attestation verification (only for first payment) ──
  displayPhaseBanner("Phase 6: <TRUST402> Attestation Verification", "greenBright");

  const firstPaymentData = payment1Result.success ? payment1Result.data as ApiResponse : null;

  const attestationResult = firstPaymentData && !R_isNil(firstPaymentData.attestation)
    ? await verifyAttestation(env, firstPaymentData)
    : { docHash: "none", verified: false, error: "No data from first payment" };

  await waitForKeypress("Continue to second payment");

  // ── Phase 7: Second payment — budget enforcement ───────────────
  displayPhaseBanner("Phase 7: <TRUST402> Budget Enforcement ($500)", "greenBright");
  await waitForKeypress("Continue to query");

  console.log("  Agent signs the corporate contract — a $500 purchase...");
  await displayQuery(2);
  await runReasoningSimulation(2);

  const url2 = `${env.resourceUrl}/contract`;
  const gate2 = buildPaymentGate(env.maxSpend);
  const payment2Result = await executeProofGatedPayment(env, artifact, url2, "POST");

  const payment2Witness = formatWitness(gate2, artifact.commitOutput);

  payment2Result.success
    ? (console.log(chalk.yellow(`\n  ⚠️  Second payment succeeded unexpectedly — budget not enforced. MAX_SPEND may be too high.\n`)),
       await waitForKeypress("Continue to transaction summary"))
    : (console.log(chalk.green(`\n  🛡️  Second payment rejected: Budget exceeded: `)+chalk.bgRed.white(`$500.00 > ${formatUsd(env.maxSpend)} spend limit\n`)),
       await printStateChange("Proof Invalid, Payment Rejected", [
         { label: "Condition", value: formatCondition(env.maxSpend, "$500.00", false) },
         { label: "Witness", value: payment2Witness },
         { label: "Proof", value: "^rFailed^: (✓ Expected)" },
         { label: "Content", value: "-" },
       ]));

  // ── Phase 8: Proof summary with blockchain events ───────────────
  displayPhaseBanner("Phase 8: Transaction Summary", "green");

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
  console.error(chalk.red(`\n  ✗ Fatal error: ${message}`));
  process.exit(1);
});
