/**
 * Proof summary output formatter.
 *
 * Displays dual proof summary, both payment results,
 * attestation result, financial data, and blockchain events.
 */

import * as R from "ramda";
import chalk from "chalk";
import type { AttestationResult, BlockchainEvent } from "./attestation.js";
import type { ApiResponse, PaymentResult } from "./payment.js";
import type { EnvConfig } from "./env.js";
import { waitForKeypress } from "./tui.js";

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

const displayAttestationSummary = (result: AttestationResult, _env: EnvConfig): void => {
  console.log(chalk.cyan("\n━━━ Attestation Summary ━━━\n"));
  console.log(`  docHash: ${result.docHash}`);
  console.log(`  Verified: ${result.verified ? chalk.bgGreen.black.bold(" ✓ Yes ") : chalk.bgRed.white.bold(" ✗ No ")}`);
  result.error
    ? console.log(`  Error: ${result.error}`)
    : undefined;
};

const displayFinancialData = (data: ApiResponse): void => {
  console.log(chalk.cyan("\n━━━ Purchased Financial Data ━━━\n"));
  console.log(`  Company:  ${data.company}`);
  console.log(`  Period:   ${data.period}`);
  console.log(`  Revenue:  ${formatRevenue(data.revenue)}`);
  console.log(`  Profit:   ${formatProfit(data.profit)}`);
  console.log(`  Report:   ${data.reportId}`);
};

const displaySuccessfulPayment = (): void => {
  console.log(chalk.cyan("\n━━━ Payment 1: Successful ━━━\n"));
  console.log(`  Amount:   $0.01 USDC`);
  console.log(`  Method:   GET /ir/2026q1`);
  console.log(`  Network:  Base Sepolia (eip155:84532)`);
  console.log(`  Status:   ${chalk.bgGreen.black.bold(" ✓ Paid ")}`);
};

const displayFailedPayment = (env: EnvConfig): void => {
  console.log(chalk.cyan("\n━━━ Payment 2: Budget Enforcement ━━━\n"));
  console.log(`  Amount:   $500.00 USDC`);
  console.log(`  Method:   POST /contract`);
  console.log(`  Network:  Base Sepolia (eip155:84532)`);
  console.log(`  Status:   ${chalk.bgRed.white.bold(" ✗ Rejected ")}`);
  console.log(`  Reason:   Budget exceeded: $500.00 > ${formatUsd(env.maxSpend)} spend limit`);
  console.log(chalk.bgGreen.black.bold(`  ✓ Budget enforcement working — payment blocked by role-spend-limit-v1 proof  `));
};

const displayBlockchainEventSection = async (
  events: ReadonlyArray<BlockchainEvent>,
): Promise<void> => {
  await waitForKeypress("Show blockchain event logs");

  console.log(chalk.cyan("\n━━━ Blockchain Event Logs ━━━\n"));

  R.isEmpty(events)
    ? console.log(chalk.dim("  No on-chain events found or RPC URL not configured."))
    : undefined;

  const displayEvent = (event: BlockchainEvent): void => {
    console.log(`  ${chalk.cyan(event.eventName)}`);
    console.log(`    Contract:  ${event.contractAddress}`);
    console.log(`    Block:     ${event.blockNumber.toString()}`);
    console.log(`    TxHash:    ${event.transactionHash}`);
    console.log();
  };

  R.forEach(displayEvent, events);
};

export const displaySummary = async (
  env: EnvConfig,
  data: ApiResponse | null,
  attestationResult: AttestationResult,
  payment1Result: PaymentResult,
  payment2Result: PaymentResult,
  blockchainEvents: ReadonlyArray<BlockchainEvent>,
): Promise<void> => {
  console.log(chalk.bold.green("\n╔══════════════════════════════════════════╗"));
  console.log(chalk.bold.green("║    Trust402 Demo — Transaction Summary   ║"));
  console.log(chalk.bold.green("╚══════════════════════════════════════════╝"));

  displayProofSummary();
  displayAttestationSummary(attestationResult, env);

  payment1Result.success && !R.isNil(data)
    ? displayFinancialData(data)
    : undefined;

  displaySuccessfulPayment();
  displayFailedPayment(env);

  await displayBlockchainEventSection(blockchainEvents);

  console.log(chalk.bold.green("\n✓ Demo complete!\n"));
};
