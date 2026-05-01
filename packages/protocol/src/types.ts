import type { CommitOutput } from "@trust402/identity";
import type { ProveOutput } from "@lemmaoracle/sdk";

export type ProveAndSubmitResult = Readonly<{
  commitOutput: CommitOutput;
  identityProof: ProveOutput;
  roleProof: ProveOutput;
  identitySubmission: unknown;
  roleSubmission: unknown;
}>;
