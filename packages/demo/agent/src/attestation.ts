/**
 * Attestation verification via Lemma oracle.
 * Blockchain event log queries for DocumentRegistered and ProofSettled.
 */

import * as R from "ramda";
import chalk from "chalk";
import { create } from "@lemmaoracle/sdk";
import type { LemmaClient } from "@lemmaoracle/sdk";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import type { EnvConfig } from "./env.js";
import type { ApiResponse } from "./payment.js";
import { typewriter } from "./tui.js";

type AttestationResult = Readonly<{
  docHash: string;
  verified: boolean;
  error?: string;
}>;

type BlockchainEvent = Readonly<{
  contractAddress: string;
  eventName: string;
  blockNumber: bigint;
  transactionHash: string;
}>;

// ── Contract addresses on Base Sepolia ────────────────────────────────

const LEMMA_REGISTRY_ADDRESS = "0x75572e7eBeFBcBaa35aB8a9a6E4a6E6422C2a89d" as const;
const LEMMA_PROOF_SETTLEMENT_ADDRESS = "0x60da20C9635897099D88B194D8e7c3E8e4Cf7621" as const;

// ── Minimal ABIs for event queries ────────────────────────────────────

const LEMMA_REGISTRY_ABI = [
  {
    type: "event",
    name: "DocumentRegistered",
    inputs: [
      { name: "docHash", type: "bytes32", indexed: true },
      { name: "commitmentRoot", type: "bytes32", indexed: false },
      { name: "schemaIdHash", type: "bytes32", indexed: true },
      { name: "issuerHash", type: "bytes32", indexed: true },
      { name: "subjectHash", type: "bytes32", indexed: false },
      { name: "revocationRoot", type: "bytes32", indexed: false },
    ],
  },
] as const;

const LEMMA_PROOF_SETTLEMENT_ABI = [
  {
    type: "event",
    name: "ProofSettled",
    inputs: [
      { name: "verificationId", type: "bytes32", indexed: true },
      { name: "docHash", type: "bytes32", indexed: true },
      { name: "circuitIdHash", type: "bytes32", indexed: true },
      { name: "verifier", type: "address", indexed: false },
      { name: "valid", type: "bool", indexed: false },
    ],
  },
] as const;

// ── Attestation verification ──────────────────────────────────────────

const extractDocHash = (response: ApiResponse): string | null =>
  response.attestation;

const verifyWithLemma = async (
  client: LemmaClient,
  docHash: string,
): Promise<AttestationResult> => {
  const verified = await fetch(
    `${client.apiBase ?? ""}/v1/verified-attributes/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": client.apiKey ?? "",
      },
      body: JSON.stringify({ attributes: [], docHash }),
    },
  )
    .then((res) => res.json() as Promise<Record<string, unknown>>)
    .then((data) => {
      const results = data.results as ReadonlyArray<Record<string, unknown>>;
      const hasProof = R.isNotEmpty(results) && !R.isNil(R.head(results)?.proof);
      return { docHash, verified: hasProof };
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      return { docHash, verified: false, error: message };
    });

  return verified;
};

export const verifyAttestation = async (
  env: EnvConfig,
  response: ApiResponse,
): Promise<AttestationResult> => {
  const docHash = extractDocHash(response);

  const noAttestation = R.isNil(docHash);
  noAttestation
    ? console.log(chalk.yellow("\n⚠️  No attestation (docHash) in response — skipping verification"))
    : undefined;

  const handleMissing = (): AttestationResult => ({
    docHash: "none",
    verified: false,
    error: "No attestation field in API response",
  });

  const handlePresent = async (): Promise<AttestationResult> => {
    const client = create({ apiBase: env.lemmaApiBase, apiKey: env.lemmaApiKey });
    const result = await verifyWithLemma(client, docHash!);

    const verificationText = result.verified
      ? "Attestation verified — this financial data is certified"
      : "Attestation could not be verified";

    result.verified
      ? console.log(chalk.green(`\n✓ ${verificationText} (docHash: ${docHash})`))
      : console.log(chalk.yellow(`\n⚠️  ${verificationText} (docHash: ${docHash})`));

    await typewriter(verificationText, { delay: 30 });

    result.error
      ? console.log(chalk.yellow(`   Error: ${result.error}`))
      : undefined;

    return result;
  };

  return noAttestation ? handleMissing() : handlePresent();
};

// ── Blockchain event queries ──────────────────────────────────────────

const createViemClient = (rpcUrl: string) =>
  createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

export const queryDocumentRegistered = async (
  rpcUrl: string,
  docHash: string,
): Promise<ReadonlyArray<BlockchainEvent>> => {
  const client = createViemClient(rpcUrl);

  const logs = await client.getLogs({
    address: LEMMA_REGISTRY_ADDRESS,
    event: LEMMA_REGISTRY_ABI[0],
    args: { docHash: docHash as `0x${string}` },
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  return R.map(
    (log) => ({
      contractAddress: LEMMA_REGISTRY_ADDRESS,
      eventName: "DocumentRegistered",
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }),
    logs,
  );
};

export const queryProofSettled = async (
  rpcUrl: string,
): Promise<ReadonlyArray<BlockchainEvent>> => {
  const client = createViemClient(rpcUrl);

  const logs = await client.getLogs({
    address: LEMMA_PROOF_SETTLEMENT_ADDRESS,
    event: LEMMA_PROOF_SETTLEMENT_ABI[0],
    fromBlock: BigInt(0),
    toBlock: "latest",
  });

  return R.map(
    (log) => ({
      contractAddress: LEMMA_PROOF_SETTLEMENT_ADDRESS,
      eventName: "ProofSettled",
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }),
    logs,
  );
};

export const queryBlockchainEvents = async (
  rpcUrl: string | undefined,
  docHash: string,
): Promise<ReadonlyArray<BlockchainEvent>> => {
  const noRpc = R.isNil(rpcUrl) || R.isEmpty(rpcUrl);

  noRpc
    ? console.log(chalk.dim("\n  RPC URL not configured — skipping on-chain event display"))
    : undefined;

  const fetchEvents = async (url: string): Promise<ReadonlyArray<BlockchainEvent>> => {
    const registered = await queryDocumentRegistered(url, docHash);
    const settled = await queryProofSettled(url);
    return [...registered, ...settled];
  };

  return noRpc ? [] : fetchEvents(rpcUrl!);
};

export const displayBlockchainEvents = (events: ReadonlyArray<BlockchainEvent>): void => {
  R.isEmpty(events)
    ? console.log(chalk.dim("  No on-chain events found."))
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

export type { AttestationResult, BlockchainEvent };
