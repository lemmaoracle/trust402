import * as R from "ramda";
import chalk from "chalk";
import * as fs from "node:fs";
import * as readline from "node:readline";
import { credential } from "@lemmaoracle/agent";
import { create, schemas, define } from "@lemmaoracle/sdk";
import {
  register as registerIdentity,
  prove as proveIdentity,
  submit as submitIdentity,
} from "@trust402/identity";
import type { CommitOutput } from "@trust402/identity";
import type { ProveOutput } from "@lemmaoracle/sdk";
import type { IdentityArtifact } from "@trust402/protocol";
import type { AgentCredential } from "@trust402/identity";
import type { EnvConfig } from "./env.js";
import { waitForKeypress } from "./tui.js";
import { poseidon1, poseidon2 } from "poseidon-lite";

const SCHEMA_ID = "agent-identity-authority-v1";
const DEMO_ISSUER_SECRET_KEY = "1";

const isNormalizedError = (normalized: unknown): normalized is { error: string } =>
  typeof normalized === "object" && normalized !== null && "error" in normalized;

const parseArtifact = (raw: string): IdentityArtifact => {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    commitOutput: parsed.commit as CommitOutput,
    identityProof: parsed.proof as ProveOutput,
    docHash: parsed.docHash as string,
    credential: parsed.credential as AgentCredential,
  };
};

const readArtifactFile = (filePath: string): IdentityArtifact | null => {
  const exists = fs.existsSync(filePath);
  const raw = exists ? fs.readFileSync(filePath, "utf8") : null;

  if (R.isNil(raw)) return null;

  const artifact = parseArtifact(raw);
  if (isNormalizedError(artifact.commitOutput.normalized)) {
    console.log(chalk.yellow(`⚠️  Artifact at ${filePath} has a failed normalization — removing and regenerating.`));
    fs.unlinkSync(filePath);
    return null;
  }

  return artifact;
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
  const hasRequiredEnv = R.isNotEmpty(env.lemmaApiKey) && R.isNotEmpty(env.holderPublicKey);
  const prompt = hasRequiredEnv
    ? "Would you like to auto-generate an artifact? (y/n): "
    : "Generate manually and re-run. Press 'q' to quit: ";

  const answer = await promptUser(prompt);
  return answer === "y" || answer === "yes";
};

const createTestCredential = (env: EnvConfig): AgentCredential => {
  const result = credential({
    agentId: env.agentId,
    subjectId: env.agentId,
    roles: ["purchaser"],
    issuerId: env.issuerId,
    spendLimit: env.maxSpend,
  });

  return result.valid
    ? result.credential
    : (() => {
        R.forEach(
          (e: { kind: string; message: string }) => process.stderr.write(`${e.kind}: ${e.message}\n`),
          result.errors,
        );
        process.exit(1);
        return undefined as never;
      })();
};

const saveArtifact = (filePath: string, artifact: IdentityArtifact): void => {
  const json = JSON.stringify({
    commit: artifact.commitOutput,
    proof: artifact.identityProof,
    docHash: artifact.docHash,
    credential: artifact.credential,
  }, null, 2);
  fs.writeFileSync(filePath, json + "\n", "utf8");
};

const computeIssuerProof = (commitmentRoot: string): Readonly<{
  issuerPublicKey: string;
  mac: string;
}> => {
  const issuerPublicKey = poseidon1([BigInt(DEMO_ISSUER_SECRET_KEY)]).toString();
  const mac = poseidon2([BigInt(commitmentRoot), BigInt(DEMO_ISSUER_SECRET_KEY)]).toString();
  return { issuerPublicKey, mac };
};

const generateArtifact = async (env: EnvConfig): Promise<IdentityArtifact> => {
  const cred = createTestCredential(env);
  const client = create({ apiKey: env.lemmaApiKey });

  // ── Step 1: Load schema ────────────────────────────────────────────
  console.log(chalk.cyan("  Loading schema..."));
  const schemaMeta = await schemas.getById(client, SCHEMA_ID);
  await define(schemaMeta);

  // ── Step 2: Register (commit + encrypt + documents.register) ───────
  console.log(chalk.cyan("  Registering document..."));
  const registerResult = await registerIdentity(client, {
    credential: cred,
    holderKey: env.holderPublicKey,
  });

  if (isNormalizedError(registerResult.commitOutput.normalized)) {
    return Promise.reject(new Error(
      `Credential normalization failed: ${registerResult.commitOutput.normalized.error}. ` +
      "The credential may have missing or invalid fields.",
    ));
  }

  // ── Step 3: Prove (generate identity proof) ────────────────────────
  const { issuerPublicKey, mac } = computeIssuerProof(registerResult.commitOutput.root);

  let proofResult: ProveOutput;
  try {
    console.log(chalk.cyan("  Generating identity proof..."));
    proofResult = await proveIdentity(client, {
      commitOutput: registerResult.commitOutput,
      issuerSecretKey: DEMO_ISSUER_SECRET_KEY,
      mac,
      issuerPublicKey,
    });
  } catch (err) {
    console.log(chalk.yellow("  ⚠ Identity proof generation failed, saving partial artifact."));
    console.log(chalk.yellow(`    Error: ${err instanceof Error ? err.message : String(err)}`));
    proofResult = { proof: "", inputs: [] };
  }

  // ── Step 4: Submit (publish proof to oracle) ──────────────────────
  const hasProof = proofResult.proof !== "";
  hasProof
    ? (console.log(chalk.cyan("  Submitting proof to oracle...")),
       await submitIdentity(client, registerResult.docHash, proofResult).catch((err: unknown) => {
         console.log(chalk.yellow(`  ⚠ Oracle submission failed: ${err instanceof Error ? err.message : String(err)}`));
       }))
    : console.log(chalk.yellow("  ⚠ Skipping oracle submission — no proof generated."));

  const artifact: IdentityArtifact = {
    commitOutput: registerResult.commitOutput,
    identityProof: proofResult,
    docHash: registerResult.docHash,
    credential: cred,
  };

  saveArtifact(env.artifactPath, artifact);
  console.log(chalk.green(`  ✓ Artifact saved to ${env.artifactPath}`));

  return artifact;
};

const formatUsd = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`;

const displayBudgetTable = (env: EnvConfig): void => {
  console.log(chalk.cyan("\n━━━ Agent Budget ━━━\n"));
  console.log(`  Role:       purchaser`);
  console.log(`  Max Spend:  ${formatUsd(env.maxSpend)}`);
  console.log();
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
      ? generateArtifact(env)
      : Promise.reject(new Error("IdentityArtifact is required. Exiting."));
  };

  const loadedArtifact = R.isNil(artifact) ? await handleMissing() : artifact;

  displayBudgetTable(env);
  await waitForKeypress("Continue to query");

  return loadedArtifact;
};
