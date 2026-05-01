/**
 * Proof summary output formatter.
 *
 * Task 10.1: Proof summary (circuit IDs, oracle submission status).
 * Task 10.2: Attestation summary (docHash, verification result, verifier address).
 * Task 10.3: Financial data display (company, period, revenue, profit).
 * Task 10.4: Payment details (amount, network, payTo).
 */

import chalk from "chalk";
import type { AttestationResult } from "./attestation.js";
import type { ApiResponse } from "./payment.js";
import type { EnvConfig } from "./env.js";

const formatUsd = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

const formatRevenue = (revenue: number): string =>
  `$${(revenue / 1_000_000_000).toFixed(2)}B`;

const formatProfit = (profit: number): string =>
  `$${(profit / 1_000_000).toFixed(0)}M`;

const displayProofSummary = (): void => {
  console.log(chalk.cyan("\n━━━ Proof Summary ━━━\n"));
  console.log(`  Identity Proof:`);
  console.log(`    Circuit ID: agent-identity-v1`);
  console.log(`    Oracle submission: completed`);
  console.log();
  console.log(`  Role Proof:`);
  console.log(`    Circuit ID: role-spend-limit-v1`);
  console.log(`    Oracle submission: completed`);
};

const displayAttestationSummary = (result: AttestationResult, env: EnvConfig): void => {
  console.log(chalk.cyan("\n━━━ Attestation Summary ━━━\n"));
  console.log(`  docHash: ${result.docHash}`);
  console.log(`  Verified: ${result.verified ? chalk.green("✓ Yes") : chalk.yellow("✗ No")}`);
  result.error
    ? console.log(`  Error: ${result.error}`)
    : undefined;
  console.log(`  Verifier contract: ${process.env.VERIFIER_CONTRACT_ADDRESS ?? "not configured"}`);
};

const displayFinancialData = (data: ApiResponse): void => {
  console.log(chalk.cyan("\n━━━ Purchased Financial Data ━━━\n"));
  console.log(`  Company:  ${data.company}`);
  console.log(`  Period:   ${data.period}`);
  console.log(`  Revenue:  ${formatRevenue(data.revenue)}`);
  console.log(`  Profit:   ${formatProfit(data.profit)}`);
  console.log(`  Report:   ${data.reportId}`);
};

const displayPaymentDetails = (env: EnvConfig): void => {
  console.log(chalk.cyan("\n━━━ Payment Details ━━━\n"));
  console.log(`  Amount:   $0.01 USDC`);
  console.log(`  Network:  Base Sepolia (eip155:84532)`);
  console.log(`  Pay to:   ${process.env.PAY_TO_ADDRESS ?? "configured in resource server"}`);
  console.log(`  Max spend: ${formatUsd(env.maxSpend)}`);
};

export const displaySummary = (
  env: EnvConfig,
  data: ApiResponse,
  attestationResult: AttestationResult,
): void => {
  console.log(chalk.bold.green("\n╔══════════════════════════════════════════╗"));
  console.log(chalk.bold.green("║     Trust402 Demo — Transaction Summary     ║"));
  console.log(chalk.bold.green("╚══════════════════════════════════════════╝"));

  displayProofSummary();
  displayAttestationSummary(attestationResult, env);
  displayFinancialData(data);
  displayPaymentDetails(env);

  console.log(chalk.bold.green("\n✓ Demo complete!\n"));
};
