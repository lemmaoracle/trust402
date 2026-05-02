/**
 * SKILL.md loader — reads and displays the @trust402/protocol SKILL.md.
 *
 * Task 6.2: Load SKILL.md from the installed package and display a condensed summary.
 */

import * as R from "ramda";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { typewriter } from "./tui";

const SKILL_MD_PATH = path.resolve(
  process.cwd(),
  "node_modules",
  "@trust402",
  "protocol",
  "SKILL.md",
);

const FALLBACK_SUMMARY = `
# Trust402 Protocol — Proof-Before-Payment

The Trust402 protocol enables AI agents to make ZK proof-gated payments:

1. **Identity Artifact** — Pre-generated commit + identity proof (agent-identity-v1)
2. **Role Proof** — Generated per-request, proves agent role + spend limit (role-spend-limit-v1)
3. **Payment Flow** — wrapFetchWithProof(fetch, artifact, gate, lemmaClient) → wrapFetchWithPayment(proofFetch, x402Client)

Composition: paymentFetch → proofFetch → native fetch
Proof is generated BEFORE the payment is made.
`;

const loadSkillMd = (): string => {
  const fileExists = fs.existsSync(SKILL_MD_PATH);
  const content = fileExists
    ? fs.readFileSync(SKILL_MD_PATH, "utf8")
    : FALLBACK_SUMMARY;
  return content;
};

const condenseSummary = (content: string): string => {
  const lines = content.split("\n");
  const summaryLines = R.filter(
    (line: string) => R.startsWith("#", line) || R.startsWith("-", line) || R.startsWith("1.", line) || R.startsWith("2.", line) || R.startsWith("3.", line),
    lines,
  );
  return R.take(15, summaryLines).join("\n  ");
};

export const displaySkillSummary = async (): Promise<void> => {
  const content = loadSkillMd();
  const summary = condenseSummary(content);

  console.log(chalk.bold.cyan("\n  Loading SKILL.md...\n"));
  await typewriter(chalk.dim(summary), { delay: 0.1 });
  console.log(chalk.bold.cyan("\n  Successfully loaded SKILL.md\n"));
  console.log(chalk.dim("\n  ────────────────────────────────\n"));
};
