/**
 * AI reasoning simulation — staged typewriter output.
 *
 * Task 6.3: Hardcoded query.
 * Task 6.4: Four-stage reasoning simulation with typewriter effects.
 */

import chalk from "chalk";

const QUERY = "Retrieve the Q1 2026 financial report for Example Corp";

const REASONING_STAGES: ReadonlyArray<Readonly<{
  label: string;
  content: string;
}>> = [
  {
    label: "Query Analysis",
    content: `User asks: "${QUERY}"\n→ This requires corporate IR data for Q1 2026.`,
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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const typewriterLine = async (text: string, delay = 15): Promise<void> => {
  const chars = text.split("");
  const writeChar = async (char: string): Promise<void> => {
    process.stdout.write(char);
    await sleep(delay);
  };
  await Promise.all(chars.map((char) => writeChar(char))).catch(() => {
    process.stdout.write(text);
  });
  process.stdout.write("\n");
};

const typewriterBlock = async (text: string): Promise<void> => {
  const lines = text.split("\n");
  for (const line of lines) {
    await typewriterLine(line, 10);
  }
};

export const displayQuery = (): void => {
  console.log(chalk.cyan(`\n📋 User Query: "${QUERY}"\n`));
};

export const runReasoningSimulation = async (): Promise<void> => {
  for (const stage of REASONING_STAGES) {
    console.log(chalk.yellow(`\n🤔 ${stage.label}:`));
    await sleep(400);
    await typewriterBlock(stage.content);
    await sleep(300);
  }
  console.log(chalk.green("\n✓ Reasoning complete. Proceeding to payment...\n"));
};
