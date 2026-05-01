import * as R from "ramda";
import { commit as identityCommit, prove as proveIdentity, submit as submitIdentity } from "@trust402/identity";
import { witness, prove as proveRole, submit as submitRole } from "@trust402/roles";
import type { AgentCredential, CommitOutput } from "@trust402/identity";
import type { LemmaClient, ProveOutput } from "@lemmaoracle/sdk";
import type { PaymentGate } from "@trust402/roles";
import type { ProveAndSubmitResult } from "./types.js";

const logWarning = (err: unknown): undefined => {
  console.warn("Oracle submission failed:", err);
  return undefined;
};

const safeSubmit = (
  submitFn: (client: LemmaClient, docHash: string, proof: ProveOutput) => Promise<unknown>,
  client: LemmaClient,
  docHash: string,
  proof: ProveOutput,
): Promise<unknown> =>
  submitFn(client, docHash, proof).catch(R.pipe(logWarning, R.always(undefined)));

const rejectIdentityFailure = (_err: unknown): Promise<never> =>
  Promise.reject(new Error("Identity proof generation failed"));

const rejectRoleFailure = (_err: unknown): Promise<never> =>
  Promise.reject(new Error("Role proof generation failed"));

export const proveAndSubmit = (
  client: LemmaClient,
  credential: AgentCredential,
  gate: PaymentGate,
): Promise<ProveAndSubmitResult> =>
  identityCommit(client, credential)
    .then((commitOutput: CommitOutput) =>
      proveIdentity(client, commitOutput)
        .catch(rejectIdentityFailure)
        .then((identityProof: ProveOutput) => {
          const circuitWitness = witness(credential, gate, commitOutput);
          return proveRole(client, circuitWitness)
            .catch(rejectRoleFailure)
            .then((roleProof: ProveOutput) => {
              const docHash = commitOutput.root;
              const identitySubmissionP = safeSubmit(submitIdentity, client, docHash, identityProof);
              const roleSubmissionP = safeSubmit(submitRole, client, docHash, roleProof);

              return Promise.all([identitySubmissionP, roleSubmissionP]).then(
                ([identitySubmission, roleSubmission]) => ({
                  commitOutput,
                  identityProof,
                  roleProof,
                  identitySubmission,
                  roleSubmission,
                }),
              );
            });
        }),
    );
