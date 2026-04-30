#!/usr/bin/env node
import { Command } from "commander";
import * as R from "ramda";
import { credential, validate, commit as agentCommit } from "@lemmaoracle/agent";
import { create, prover, proofs } from "@lemmaoracle/sdk";
import type { AgentCredential, AgentCredentialInput } from "@lemmaoracle/agent";

// ── Helpers ───────────────────────────────────────────────────────────

const parseCommaList = (val: string): ReadonlyArray<string> =>
  R.pipe(
    R.split(","),
    R.map(R.trim),
    R.reject(R.isEmpty),
  )(val);

const readJsonFile = async (filePath: string): Promise<unknown> => {
  const fs = await import("node:fs/promises");
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content);
};

// ── Create command ────────────────────────────────────────────────────

const createCommand = new Command("create")
  .description("Create a validated agent identity credential")
  .requiredOption("--agent-id <id>", "Agent identifier")
  .requiredOption("--subject-id <id>", "Subject identifier")
  .requiredOption("--roles <roles>", "Comma-separated role names")
  .requiredOption("--issuer-id <id>", "Issuer identifier")
  .option("--controller-id <id>", "Controller identifier")
  .option("--org-id <id>", "Organisation identifier")
  .option("--scopes <scopes>", "Comma-separated scope names")
  .option("--spend-limit <number>", "Spend limit (integer)", parseInt)
  .option("--currency <code>", "3-letter ISO 4217 currency code")
  .option("--expires-at <timestamp>", "Expiration epoch seconds", parseInt)
  .option("--source-system <system>", "Source system identifier")
  .option("--generator-id <id>", "Generator identifier")
  .option("--chain-id <number>", "Chain ID (integer)", parseInt)
  .option("--network <network>", "Network name")
  .action((opts) => {
    const input: AgentCredentialInput = {
      agentId: opts.agentId,
      subjectId: opts.subjectId,
      roles: parseCommaList(opts.roles),
      issuerId: opts.issuerId,
      controllerId: opts.controllerId,
      orgId: opts.orgId,
      scopes: opts.scopes ? parseCommaList(opts.scopes) : undefined,
      spendLimit: opts.spendLimit,
      currency: opts.currency,
      expiresAt: opts.expiresAt,
      sourceSystem: opts.sourceSystem,
      generatorId: opts.generatorId,
      chainId: opts.chainId,
      network: opts.network,
    };

    const result = credential(input);

    result.valid
      ? process.stdout.write(JSON.stringify(result.credential, null, 2) + "\n")
      : (() => {
          R.forEach(
            (e: { kind: string; message: string }) => process.stderr.write(`${e.kind}: ${e.message}\n`),
            result.errors,
          );
          process.exit(1);
        })();
  });

// ── Validate command ──────────────────────────────────────────────────

const validateCommand = new Command("validate")
  .description("Validate an agent identity credential file")
  .argument("<file>", "Path to credential JSON file")
  .action(async (filePath: string) => {
    const cred = await readJsonFile(filePath);
    const result = validate(cred);

    result.valid
      ? process.stdout.write("Valid\n")
      : (() => {
          R.forEach(
            (e: { kind: string; message: string }) => process.stderr.write(`${e.kind}: ${e.message}\n`),
            result.errors,
          );
          process.exit(1);
        })();
  });

// ── Prove command ─────────────────────────────────────────────────────

const proveCommand = new Command("prove")
  .description("Execute commit → prove → submit pipeline for a credential")
  .requiredOption("--credential <path>", "Path to credential JSON file")
  .requiredOption("--api-key <key>", "Lemma API key")
  .option("--dry-run", "Skip the submit step")
  .action(async (opts) => {
    const cred = await readJsonFile(opts.credential);

    const validationResult = validate(cred);
    const credObj = validationResult.valid
      ? validationResult.credential
      : (() => {
          R.forEach(
            (e: { kind: string; message: string }) => process.stderr.write(`${e.kind}: ${e.message}\n`),
            validationResult.errors,
          );
          process.exit(1);
          return undefined as never;
        })();

    const client = create({ apiKey: opts.apiKey });
    const commitResult = await agentCommit(client, credObj);
    const proofResult = await prover.prove(client, {
      circuitId: "agent-identity-v1",
      witness: commitResult,
    });

    const submission = opts.dryRun
      ? undefined
      : await proofs.submit(client, {
          docHash: commitResult.root,
          circuitId: "agent-identity-v1",
          proof: proofResult.proof,
          inputs: proofResult.inputs,
        });

    const output = opts.dryRun
      ? { commit: commitResult, proof: proofResult }
      : { commit: commitResult, proof: proofResult, submission };

    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  });

// ── Program ──────────────────────────────────────────────────────────

export const program = new Command("trust402-agent")
  .description("Trust402 agent identity CLI")
  .version("0.0.1")
  .exitOverride()
  .addCommand(createCommand)
  .addCommand(validateCommand)
  .addCommand(proveCommand);

// Only parse when executed directly (not when imported by tests)
R.when(
  () => process.argv[1]?.endsWith("cli.js") ?? false,
  () => program.parse(),
);
