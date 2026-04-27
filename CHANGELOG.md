# Changelog

Public-facing changes to this docs / interfaces / examples repo.
For engineering monorepo changes, see the main project.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
