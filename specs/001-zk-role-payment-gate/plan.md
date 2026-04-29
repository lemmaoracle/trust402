# Implementation Plan: ZK Role-Gated Autonomous Payments

**Branch**: `001-zk-role-payment-gate` | **Date**: 2026-04-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-zk-role-payment-gate/spec.md`

## Summary

A single Groth16 circuit (`role-spend-limit`) that proves an autonomous agent holds a required role and has a spend limit within a payment gate ceiling. The package provides thin TypeScript wrappers (witness builder, prove, submit, connect) that delegate crypto operations to `@lemmaoracle/sdk`, plus registration scripts for the Lemma oracle and a SKILL.md enforcement template for proof-before-payment protocol.

## Technical Context

**Language/Version**: TypeScript 5.8+ (ES2022, ESNext modules), Circom 2.1.x
**Primary Dependencies**: `@lemmaoracle/sdk` 0.0.22+, `@lemmaoracle/spec` 0.0.22+, `circomlib` 2.0.5, `snarkjs` 0.7.5, `circomlibjs` 0.1.7
**Storage**: IPFS (Pinata) for circuit artifacts; Lemma oracle API for metadata
**Testing**: Vitest 3.x (co-located `*.test.ts`)
**Target Platform**: Node.js 20+, pnpm workspace
**Project Type**: Library (npm package `@trust402/roles`) with embedded Circom circuit
**Performance Goals**: Groth16 proof generation under 5 seconds
**Constraints**: All TypeScript follows functional programming rules (no if/switch/let/var/class/for/while/throw)
**Scale/Scope**: Single circuit, 17 functional requirements, 3 user stories, 5 edge cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is not yet filled in (template placeholders remain). The following principles are derived from the existing `.cursorrules` and the Lemma project's established conventions:

| Principle | Status | Notes |
|---|---|---|
| FP style (no if/switch/let/var/class/for/while/throw) | PASS | All TS code uses Ramda, ternaries, Promise.reject |
| SDK delegation (no local crypto reimplementation) | PASS | Prove/verify/submit delegate to `@lemmaoracle/sdk` |
| Co-located tests (`foo.ts` → `foo.test.ts`) | PASS | Test files exempt from FP rules |
| Readonly data structures | PASS | All types use `Readonly<>` / `ReadonlyArray<>` |
| TypeScript strict mode | PASS | `strict: true` in tsconfig.json |
| No statements (branching via expressions) | PASS | Uses ternary, R.cond, R.ifElse patterns |

## Project Structure

### Documentation (this feature)

```text
specs/001-zk-role-payment-gate/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
trust402/
├── package.json                        # Root: pnpm workspace
├── pnpm-workspace.yaml
├── .cursorrules                        # FP rules
├── .specify/                           # Spec Kit artifacts
├── specs/                              # Feature specs
└── packages/
    └── roles/
        ├── package.json                # @trust402/roles
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── SKILL.md                    # Proof-before-payment protocol
        ├── README.md
        ├── src/
        │   ├── index.ts                # witness, prove, submit, connect
        │   ├── index.test.ts           # Co-located tests
        │   └── role-spend-limit.test.ts # Circuit-related tests
        ├── circuits/
        │   ├── src/
        │   │   └── role-spend-limit.circom
        │   └── scripts/
        │       └── build.sh            # circom + snarkjs pipeline
        ├── scripts/
        │   ├── register-schema.ts
        │   └── register-circuit.ts
        └── presets/
            ├── schemas/
            │   └── role-spend-limit-v1.json
            └── circuits/
                └── role-spend-limit-v1.json
```

**Structure Decision**: Single-package monorepo. The circuit is embedded as a subdirectory of the roles package rather than a separate workspace package. This avoids pnpm workspace nesting issues and keeps the circuit + its TypeScript glue together. Registration scripts and preset manifests live in the roles package root.

## Complexity Tracking

No constitution violations to justify.
