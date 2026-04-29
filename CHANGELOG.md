# 📋 Changelog

Public-facing changes to this docs / interfaces / examples repo.
For engineering monorepo changes, see the main project.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.2.0] — 2026-04-29

### Changed

- Terminology: "Agent-Mediated Claw Protocol" → **Agent-Mediated Bounty Protocol** across all docs.
- Repo is now **code-first** — narrative MDs link out to real signatures rather than restating them in prose.

### Added

- `interfaces/sdk/` — full `@beesi/claw-sdk` surface extracted from production source (`packages/claw-sdk/src/{demand,supply}.ts`):
  - `demand-claw.md` — every `DemandClaw` method with the exact production signature.
  - `supply-claw.md` — every `SupplyClaw` method.
  - `types.md` — `Task`, `BountyConfig`, `Submission`, `BountyResult`, `TaskResultWebhook`, etc., copied verbatim from `@beesi/shared`.
- `interfaces/mcp/tools.md` — all 16 MCP tools with their real JSON Schemas and the request bodies the server emits.
- `interfaces/api/routes.md` — full `/v1/*` route table extracted from `apps/api/src/routes/*.ts` and `functions/src/index.ts`, including auth headers, body shapes, and error model.
- `examples/src/mcp-call-tool.ts` — programmatic MCP client invoking `create_task` → `fund_task_custodial` → `natural_language_query`.

### Fixed

- `examples/src/bid-and-submit.ts` — body shapes now match the real production routes (`POST /v1/bids` with `eta_minutes` + `device_capabilities`, `POST /v1/submissions` with `artifacts[].sha256` + `meta.ts`). The previous version used invented field names.
- `examples/src/fund-task-evm.ts` and `fund-task-solana.ts` — `POST /v1/tasks` body now matches `createTaskSchema` (geo / budget / requirements / deadline / callback_url / demand_claw_id) instead of an invented flat schema.
- All examples now send the real auth headers (`x-beesi-api-key` + `x-beesi-wallet-address`).

### Removed

- `interfaces/api/openapi-summary.md` (superseded by `interfaces/api/routes.md`).

---

## [0.1.2] — 2026-04-28

### Changed

- Added emoji throughout docs for better community feel and readability.
- Cleaned final comment referencing internal `taskKey` derivation algorithm.

---

## [0.1.1] — 2026-04-28

### Security

- **CRITICAL**: Removed `"viem-local (raw operator key, server-side)"` language from `TECH-STACK.md` and `ARCHITECTURE.md` — replaced with generic "server-side signer". Avoids revealing operator signing infra as an attack target.
- **HIGH**: Removed `keccak256(toHex(taskId))` taskKey derivation from examples — replaced with instructions to fetch `task_key` from the API.
- **MEDIUM**: Replaced "CDP `signTransaction`" with "hosted key management service" across all files.
- **LOW**: `webhook-receiver.ts` now refuses to start if `WEBHOOK_HMAC_SECRET` is unset, instead of silently falling back to `"change-me"`.

---

## [0.1.0] — 2026-04-28

### Added

- Initial public release of `beesi.ai-agent-bounty-market`.
- `README.md` — pitch, half-open scope, status table.
- `HIGHLIGHTS.md` — five technical differentiators with trade-offs spelled out.
- `ARCHITECTURE.md` — layered model, component responsibilities, data ownership, trust boundary, state machine.
- `WORKFLOWS.md` — happy path, reject, refund, RFQ, auto-approve flows.
- `TECH-STACK.md` — components, versions, selection rationale.
- `GLOSSARY.md` — protocol vocabulary.
- `ROADMAP.md` — audit-gated mainnet stance.
- `interfaces/evm/IBeesiEscrow.sol` — public Solidity interface for `BeesiEscrow` V3.
- `interfaces/solana/beesi_escrow.idl.json` — Anchor IDL for the Solana program.
- `interfaces/api/openapi-summary.md` — endpoint and error model summary.
- `examples/` — runnable TypeScript examples for funding (EVM + Solana), bidding/submitting, and webhook receiving.
- `.github/` — issue templates, discussion templates, PR template, docs-check workflow.
- `diagrams/` — standalone Mermaid sources for architecture and settlement flows.
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `LICENSE-DOCS`, `LICENSE`.
