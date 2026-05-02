/**
 * AI reasoning simulation — staged typewriter output with keypress gates.
 *
 * Two query flows:
 *   1. "Q1 2026 financial report for Example Corp" → GET /ir/2026q1 ($0.01)
 *   2. "All the historical financial report for Example Corp" → POST /contract ($500)
 */

import chalk from "chalk";
import { waitForKeypress, typewriter } from "./tui.js";

const QUERY_1 = "Q1 2026 financial report for Example Corp";
const QUERY_2 = "All the historical financial report for Example Corp";

const REASONING_STAGES_1: ReadonlyArray<Readonly<{
  label: string;
  content: string;
}>> = [
  {
    label: "Query Analysis",
    content: `User asks: "${QUERY_1}"\n→ This requires corporate IR data for Q1 2026.`,
  },
  {
    label: "API Discovery",
    content: "Found paid API: GET /ir/2026q1 ($0.01 USDC on Base Sepolia)\n→ This endpoint returns financial data behind an x402 paywall.",
  },
  {
    label: "Attestation Awareness",
    content: "The response will include a docHash attestation.\n→ I can verify data authenticity via the Lemma oracle after payment.",
  },
  {
    label: "Payment Authorization",
    content: "Proceeding with proof-gated payment.\n→ I will generate a role proof (role-spend-limit-v1) before the fetch.",
  },
];

const REASONING_STAGES_2: ReadonlyArray<Readonly<{
  label: string;
  content: string;
}>> = [
  {
    label: "Query Analysis",
    content: `User asks: "${QUERY_2}"\n→ This requires the full corporate contract — a high-value purchase.`,
  },
  {
    label: "API Discovery",
    content: "Found paid API: POST /contract ($500 USDC on Base Sepolia)\n→ This endpoint provides the master service agreement contract.",
  },
  {
    label: "Attestation Awareness",
    content: "The response will include a docHash attestation.\n→ The $500 price exceeds my budget — proof generation should fail.",
  },
  {
    label: "Payment Authorization",
    content: "Attempting proof-gated payment despite budget constraint.\n→ This will demonstrate budget enforcement via role-spend-limit-v1.",
  },
];

export const displayQuery = async (queryIndex: 1 | 2): Promise<void> => {
  const query = queryIndex === 1 ? QUERY_1 : QUERY_2;
  console.log(chalk.cyan(`\n📋 User Query:`));
  await typewriter(query, { delay: 80 });
};

export const runReasoningSimulation = async (queryIndex: 1 | 2): Promise<void> => {
  const stages = queryIndex === 1 ? REASONING_STAGES_1 : REASONING_STAGES_2;

  for (const stage of stages) {
    await waitForKeypress(`Continue to ${stage.label}`);
    console.log(chalk.yellow(`\n🤔 ${stage.label}:`));
    await typewriter(stage.content, { delay: 15 });
  }
  console.log(chalk.green("\n✓ Reasoning complete. Proceeding to payment...\n"));
};

export { QUERY_1, QUERY_2 };
