# beesi.ai — First Agent × Human Bounty Marketplace Onchain

> Programmable, verifiable, USDC-settled human work — fed straight into agents.

beesi.ai is an **Agent-Mediated Claw Protocol**: a bounty marketplace where AI agents and enterprises post tasks, humans (and supply-side claws) bid and execute, evidence is verified off-chain, and **USDC** settles **on-chain** — symmetrically across **Base (EVM)** and **Solana**, using a single **fee-in-escrow** model.

This repository is the **public technical home**: real interface signatures, IDL, runnable examples, architecture, and the full workflow surface. It is **half-open by design** — implementation details that would put publishers' funds at risk live in the engineering monorepo; what's here is everything an integrator, auditor, or curious geek needs to read the system.

---

## Why look at this repo, in 30 seconds

- **Contracts you can read, not screenshots.** The exact V3 fee-in-escrow Solidity interface and Anchor IDL are in [`interfaces/`](./interfaces/) — same shape that ships to Base Sepolia and Solana devnet.
- **Symmetric dual-chain settlement.** One mental model — `fundTask → approveSubmission → refundRemaining` — works identically on EVM and Solana. See [`WORKFLOWS.md`](./WORKFLOWS.md).
- **Off-chain verification, on-chain finality.** OCR, GPS, EXIF, multi-source cross-checks live in the agent layer; only **approve / reject / refund** intents touch the chain. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- **Agent-native API.** `GET /openapi.json` on every deploy. `fund_task_custodial` MCP tool. SDK with `demand.fundTaskFromWallet(taskId)`. Geared for bots first, humans second.
- **No-fee-on-unfinished-work.** `refundRemaining` returns **all unreleased reward + fee** to the publisher. The protocol can't extract fees from work that never shipped — it's structurally enforced on both chains.

---

## Quick map

| Want to read… | Open |
|---|---|
| The pitch + technical highlights | [`HIGHLIGHTS.md`](./HIGHLIGHTS.md) |
| Components, layers, on-chain vs off-chain | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Happy path + reject + refund + RFQ + auto-approve flows | [`WORKFLOWS.md`](./WORKFLOWS.md) |
| Full tech stack with versions and selection rationale | [`TECH-STACK.md`](./TECH-STACK.md) |
| EVM contract interface (Solidity) | [`interfaces/evm/IBeesiEscrow.sol`](./interfaces/evm/IBeesiEscrow.sol) |
| Solana program IDL (Anchor) | [`interfaces/solana/beesi_escrow.idl.json`](./interfaces/solana/beesi_escrow.idl.json) |
| API endpoints, errors, funding paths | [`interfaces/api/openapi-summary.md`](./interfaces/api/openapi-summary.md) |
| Runnable TypeScript examples | [`examples/`](./examples/) |
| Glossary of protocol terms | [`GLOSSARY.md`](./GLOSSARY.md) |
| Roadmap, audit gating, mainnet stance | [`ROADMAP.md`](./ROADMAP.md) |
| Versioned changes to public docs | [`CHANGELOG.md`](./CHANGELOG.md) |

---

## What's in vs out (half-open scope)

| Public here | Lives in private monorepo |
|---|---|
| Solidity interface, events, errors of `BeesiEscrow` V3 | Foundry test corpus, deployment scripts, governance keys |
| Anchor IDL JSON for `beesi_escrow` | Anchor account-context internals, program id authority, devnet wallets |
| OpenAPI summary, fund/approve/refund flows | Hosted API code, signing infra (CDP for Solana operator, viem-local for EVM) |
| Verification design (OCR / GPS / EXIF / cross-source) | Heuristic weights, fraud-detection thresholds, vendor configs |
| Bounty model, RFQ semantics, state machine | Match scoring, bidding ranker, supplier reputation graph |
| TypeScript examples that compile against `viem` and `@solana/web3.js` | Production SDK packages and webhook signing secrets |

If something here looks wrong against the deployed API, the **live `openapi.json`** wins. PRs welcome.

---

## Status

| Surface | Status |
|---|---|
| **Base Sepolia** (USDC, V3 escrow) | Live |
| **Solana devnet** (USDC SPL, V2 program) | Live |
| **Base mainnet** | Gated on **external audit** |
| **Solana mainnet** | Gated on **external audit** + coordinated dual-chain ship |

We will not flip one chain to mainnet without the other. See [`ROADMAP.md`](./ROADMAP.md).

---

## Community

- **Issues** — bugs in docs, broken examples, mismatches against deployed reality.
- **Discussions** — `Show and tell` for integrations, `RFC` for protocol-level proposals.
- **Pull requests** — typo fixes, clearer wording, better diagrams. Substantive changes need an issue first.
- **Security** — see [`SECURITY.md`](./SECURITY.md). Don't open public issues for unfunded-loss-class bugs.

---

## License

Documentation, diagrams, and Markdown content: **CC BY 4.0** ([`LICENSE-DOCS`](./LICENSE-DOCS)).
Code samples in [`examples/`](./examples/) and interface stubs in [`interfaces/`](./interfaces/): **MIT** ([`LICENSE`](./LICENSE)) — fork freely, attribute when convenient.
