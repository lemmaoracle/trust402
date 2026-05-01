import type { LemmaClient } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { IdentityArtifact, ProveRoleResult } from "./types.js";
import { proveRoleFromArtifact } from "./prove-role-from-artifact.js";

const proceedToFetch = (
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  _result: ProveRoleResult,
): Promise<Response> => baseFetch(input, init);

export const wrapFetchWithProof = (
  baseFetch: typeof fetch,
  artifact: IdentityArtifact,
  gate: PaymentGate,
  lemmaClient: LemmaClient,
): typeof fetch =>
  (input: RequestInfo | URL, init?: RequestInit) =>
    proveRoleFromArtifact(lemmaClient, artifact, gate)
      .then((result) => proceedToFetch(baseFetch, input, init, result));