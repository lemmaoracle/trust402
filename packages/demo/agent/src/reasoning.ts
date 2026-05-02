/**
 * AI reasoning simulation — staged typewriter output with keypress gates.
 *
 * Two query flows:
 *   1. "Q1 2026 financial report for Example Corp" → GET /ir/2026q1 ($0.01)
 *   2. "Sign master service agreement with Example Corp" → POST /contract ($500)
 */

import chalk from "chalk";
import { waitForKeypress, typewriter } from "./tui.js";

const QUERY_1 = "Q1 2026 financial report for Example Corp";
const QUERY_2 = "Sign master service agreement with Example Corp";

const REASONING_STAGES_1: ReadonlyArray<Readonly<{
  label: string;
  content: string;
}>> = [
  {
    label: "Query Analysis",
    content: `"${QUERY_1}"\n  → Requires corporate IR data for Q1 2026.`,
  },
  {
    label: "API Discovery",
    content: "Found GET /ir/2026q1 ($0.01 USDC)\n  → Behind x402 paywall.",
  },
  {
    label: "Attestation",
    content: "Response includes docHash.\n  → Authenticity verifiable via Lemma oracle.",
  },
  {
    label: "Authorization",
    content: "Proceeding with proof-gated payment.\n  → Generating role proof (role-spend-limit-v1).",
  },
];

const REASONING_STAGES_2: ReadonlyArray<Readonly<{
  label: string;
  content: string;
}>> = [
  {
    label: "Query Analysis",
    content: `"${QUERY_2}"\n  → Requires full corporate contract (high-value).`,
  },
  {
    label: "API Discovery",
    content: "Found POST /contract ($500 USDC)\n  → Provides master service agreement.",
  },
  {
    label: "Authorization",
    content: "Attempting payment despite budget constraint.\n  → Demonstrates budget enforcement via role-spend-limit-v1.",
  },
];

export const displayQuery = async (queryIndex: 1 | 2): Promise<void> => {
  const query = queryIndex === 1 ? QUERY_1 : QUERY_2;
  console.log(chalk.cyan(`\n  📋 User Query:`));
  await typewriter(`  ${query}`, { delay: 40 });
};

export const runReasoningSimulation = async (queryIndex: 1 | 2): Promise<void> => {
  const stages = queryIndex === 1 ? REASONING_STAGES_1 : REASONING_STAGES_2;

  for (const stage of stages) {
    console.log(chalk.yellow(`\n  🤔 ${stage.label}:`));
    await typewriter(`  ${stage.content}`, { delay: 5 });
  }
  console.log(chalk.green("\n  ✓ Reasoning complete. Proceeding to payment...\n"));
};

export { QUERY_1, QUERY_2 };
