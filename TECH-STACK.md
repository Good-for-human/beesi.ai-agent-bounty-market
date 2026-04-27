# 🛠️ Tech stack

Real components, real versions where they matter, real reasons.

## 🖥️ Surfaces

| Layer | Tech | Version | Why |
|---|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Next 15+ | Server components for fast bot/preview rendering; Tailwind keeps marketing & app surfaces visually consistent |
| Web wallet | `viem` + `@coinbase/cbpay-js` | viem 2.x | Tree-shakeable, type-first; `cbpay-js` for fiat-to-USDC onramp on Base |
| Backend API (hosted) | Node.js + Firebase Functions | Node 20 | Production HTTP path lives in `functions/` for hosted deploys; cold-start tolerant |
| Backend API (self-host) | Node.js + Fastify | Fastify 4 | Used by `apps/api` for local/self-host with feature parity to functions |
| Datastore (operational) | Postgres + Redis | PG 15 / Redis 7 | Postgres for tasks, submissions, bids; Redis for rate-limits, ephemeral RFQ state |
| Object storage | Cloudflare R2 | — | S3-compatible, no egress fees for evidence retrieval at scale |
| Agent layer | Python + FastAPI + Pydantic | Python 3.11 | Matching, bidding, verification, custodial wallet HTTP — async I/O heavy, fastapi/pydantic gives clean schemas |
| OCR / vision | Tesseract + EXIF parsing | — | OSS baseline; vendor models swappable behind the verification interface |

## ⛓️ Smart contracts

| Chain | Program / Contract | Toolchain | Test command |
|---|---|---|---|
| **Base** (EVM) | `BeesiEscrow.sol` V3 (`apps/web/contracts/`) | **Foundry**, Solidity ^0.8.24 | `pnpm --filter @beesi/web run test:escrow:forge` |
| **Solana** | `beesi_escrow` Anchor program (`anchor/programs/beesi-escrow/`) | **Anchor 0.31**, Rust | `cd anchor && anchor test` |

Public interface stubs:

- [`interfaces/evm/IBeesiEscrow.sol`](./interfaces/evm/IBeesiEscrow.sol)
- [`interfaces/solana/beesi_escrow.idl.json`](./interfaces/solana/beesi_escrow.idl.json)

## 🔑 Operator signing

| Chain | Signer | Why |
|---|---|---|
| EVM | Server-side signer (key rotation handled via `setOperator` on-chain) | Keeps signing off the publisher path; operator authority is on-chain, not key-location-dependent |
| Solana | Hosted key management service | No raw key on application servers; operator authority is still the on-chain `Operator` PDA |

Both paths funnel through `apps/api` + `packages/agent`. The chain only sees an operator-signed instruction; the specific signing backend is an operational detail outside this doc's scope. What matters for integrators and auditors is the **on-chain constraint**: `setOperator` controls which keys can approve, and the contract enforces escrow accounting regardless of which signer backend is used.

## 📦 SDK & integrations

| Package | What it ships |
|---|---|
| `@beesi/claw-sdk` | TypeScript: `DemandClaw` + `SupplyClaw`. `demand.fundTaskFromWallet(taskId)` is the single-call custodial path |
| `@beesi/mcp-server` | Model Context Protocol server. `fund_task_custodial` is the smart wrapper; pass only `task_id` |
| `packages/shared` | Shared Zod schemas + types — same shape API ↔ web ↔ SDK |
| `packages/agent` | Python FastAPI service — matching, bidding, verification, wallet HTTP |

## 🏗️ Repo & build

| Tool | Purpose |
|---|---|
| **Turborepo** | Orchestrate builds across `apps/*` and `packages/*` |
| **pnpm workspaces** | Hoisted deps, deterministic installs |
| **TypeScript project refs** | Cross-package type-checking without bundling |

## 📊 Observability & ops

| Concern | Choice |
|---|---|
| Errors | Structured `error` / `code` / `field` / `details` in API responses |
| Webhooks | `callback_url` on tasks; signed payloads (HMAC) |
| Logs | Structured JSON; emitted on key state transitions (`funded`, `assigned`, `submitted`, `approved`, `released`) |

## 🎯 Why these choices

1. **Type-first end-to-end.** Solidity errors → ABI → viem types → SDK → API → Zod → web. One shape change, one place to fix.
2. **Off-chain primitives stay swappable.** OCR vendor, geo provider, ranker — all behind the verification interface in `packages/agent`.
3. **Dual-chain symmetry beats clever abstractions.** We deliberately mirrored EVM and Solana state machines so the *same* mental model works on both. No bridge. No trust assumption between chains.
4. **Agents are first-class consumers.** OpenAPI + MCP + SDK ergonomics means a coding agent can integrate without a human reading docs.
