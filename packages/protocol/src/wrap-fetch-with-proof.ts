import type { AgentCredential } from "@trust402/identity";
import type { LemmaClient } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { ProveAndSubmitResult } from "./types.js";
import { proveAndSubmit } from "./prove-and-submit.js";

const proceedToFetch = (
  baseFetch: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  _result: ProveAndSubmitResult,
): Promise<Response> => baseFetch(input, init);

export const wrapFetchWithProof = (
  baseFetch: typeof fetch,
  credential: AgentCredential,
  gate: PaymentGate,
  lemmaClient: LemmaClient,
): typeof fetch =>
  (input: RequestInfo | URL, init?: RequestInit) =>
    proveAndSubmit(lemmaClient, credential, gate)
      .then((result) => proceedToFetch(baseFetch, input, init, result));
