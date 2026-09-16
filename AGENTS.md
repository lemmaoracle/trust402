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

---

## OSS Attribution Discipline

When absorbing code from external OSS, declare its origin (repo / commit / upstream
path / whether modified) in `attribution.json` **in the same commit**. Retain an
attribution header (`Portions of this file are derived from <repo>`) at the file head.
`node scripts/check-attribution.mjs` verifies this in CI.

Undeclared absorption cannot be detected. Declaration is mandatory; the checker
verifies declared accuracy only.
