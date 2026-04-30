# Trust402 — Agent Guidelines

pnpm workspace. TypeScript strict mode everywhere.

## Packages

- `packages/roles` — ZK role-enforcement circuits for autonomous agent payments (`@trust402/roles`). Includes CLI (`trust402-agent`), Circom circuit, and TypeScript library.
- `packages/roles/circuits` — Circom 2.1.x circuits (Groth16 + BN254).

## Rules

- All types use `Readonly<>` / `ReadonlyArray<>`.
- Follow functional programming style: see `docs/architecture/fp.md`.
- `*.test.ts` files are exempt from `eslint-plugin-functional`.
- CLI entry points (`cli.ts`) have relaxed FP rules (Commander.js imperative patterns).
- Tests: Vitest co-located (`foo.ts` → `foo.test.ts`).

## SDK delegation

All cryptographic operations delegate to `@lemmaoracle/sdk`. Circuit artifacts are stored on IPFS (Pinata); metadata via the Lemma oracle API.
