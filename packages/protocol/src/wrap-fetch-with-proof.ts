import type { LemmaClient } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { IdentityArtifact, ProveRoleResult } from "./types.js";
import { proveRoleFromArtifact } from "./prove-role-from-artifact.js";

export type WrapFetchWithProofOptions = Readonly<{
  chainId?: number;
  onProofResult?: (result: ProveRoleResult) => void;
  webhookUrl?: string;
  webhookApiKey?: string;
  agentId?: string;
  attemptedSpend?: number;
}>;

const proceedToFetch = (
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  _result: ProveRoleResult,
): Promise<Response> => baseFetch(input, init);

const invokeCallback = (
  onProofResult: ((result: ProveRoleResult) => void) | undefined,
  result: ProveRoleResult,
): ProveRoleResult => {
  onProofResult?.(result);
  return result;
};

export const wrapFetchWithProof = (
  baseFetch: typeof fetch,
  artifact: IdentityArtifact,
  gate: PaymentGate,
  lemmaClient: LemmaClient,
  options?: WrapFetchWithProofOptions,
): typeof fetch =>
  (input: RequestInfo | URL, init?: RequestInit) =>
    proveRoleFromArtifact(lemmaClient, artifact, gate, options)
      .then((result) => invokeCallback(options?.onProofResult, result))
      .then((result) => proceedToFetch(baseFetch, input, init, result));
