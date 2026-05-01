/**
 * IdentityArtifact detection and generation dialog.
 *
 * Task 7.1: Detect artifact file existence.
 * Task 7.2: Interactive generation dialog when absent.
 * Task 7.3: Parse artifact.json mapping commit → commitOutput, proof → identityProof.
 */

import * as R from "ramda";
import chalk from "chalk";
import * as fs from "node:fs";
import * as readline from "node:readline";
import type { IdentityArtifact, CommitOutput, ProveOutput } from "@trust402/protocol";
import type { AgentCredential } from "@trust402/identity";
import type { EnvConfig } from "./env.js";

const readArtifactFile = (filePath: string): IdentityArtifact | null => {
  const exists = fs.existsSync(filePath);
  const raw = exists ? fs.readFileSync(filePath, "utf8") : null;

  return R.isNil(raw)
    ? null
    : parseArtifact(raw);
};

const parseArtifact = (raw: string): IdentityArtifact => {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    commitOutput: parsed.commit as CommitOutput,
    identityProof: parsed.proof as ProveOutput,
    docHash: parsed.docHash as string,
    credential: parsed.credential as AgentCredential,
  };
};

const promptUser = (question: string): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });

const displayArtifactExplanation = (): void => {
  console.log(chalk.yellow("\n⚠️  No IdentityArtifact found."));
  console.log("An IdentityArtifact is required to generate ZK proofs for payment.");
  console.log("It contains:");
  console.log("  - commit:   The credential commitment output (agent-identity-v1)");
  console.log("  - proof:    The identity proof from the Lemma oracle");
  console.log("  - docHash:  The document hash from encrypt + register");
  console.log("  - credential: The original agent credential\n");
  console.log("To generate one, run:");
  console.log(chalk.cyan("  trust402 create --agent-id <id> --subject-id <id> --roles <roles> --issuer-id <id> > credential.json"));
  console.log(chalk.cyan("  trust402 prove --credential credential.json --api-key <key> --holder-key <hex> > artifact.json\n"));
};

const offerAutoGenerate = async (env: EnvConfig): Promise<boolean> => {
  const hasRequiredEnv = R.isNotEmpty(env.lemmaApiKey) && R.isNotEmpty(env.agentPrivateKey);
  const prompt = hasRequiredEnv
    ? "Would you like to auto-generate an artifact? (y/n): "
    : "Generate manually and re-run. Press 'q' to quit: ";

  const answer = await promptUser(prompt);
  return answer === "y" || answer === "yes";
};

export const loadOrPromptArtifact = async (env: EnvConfig): Promise<IdentityArtifact> => {
  const artifact = readArtifactFile(env.artifactPath);

  const artifactFound = !R.isNil(artifact);
  artifactFound
    ? console.log(chalk.green(`✓ IdentityArtifact loaded from ${env.artifactPath}`))
    : undefined;

  const handleMissing = async (): Promise<IdentityArtifact> => {
    displayArtifactExplanation();
    const shouldGenerate = await offerAutoGenerate(env);

    return shouldGenerate
      ? Promise.reject(new Error("Auto-generation not yet implemented. Please run trust402 create + trust402 prove manually."))
      : Promise.reject(new Error("IdentityArtifact is required. Exiting."));
  };

  return R.isNil(artifact) ? handleMissing() : artifact;
};
