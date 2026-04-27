# ✨ Highlights — what makes beesi.ai different

Five things you actually can't get out of stitching together a few off-the-shelf pieces.

---

## 1. 🔒 Fee-in-escrow, structurally enforced

When a publisher funds a task, **`(reward + fee) × max_instances`** is locked atomically. There is no separate fee escrow, no off-chain ledger that has to "remember" which fees the platform earned, and no privileged path for the platform to extract fees from work that never shipped.

The chain enforces three properties:

| Property | How |
|---|---|
| Approving a submission pays performer **and** fee in the same transaction | `approveSubmission` does a single accounted transfer; partial state is impossible |
| Unapproved work returns reward **and** fee to publisher | `refundRemaining` returns reward + fee components for all unreleased slots |
| The same `(taskKey, submissionKey)` cannot be paid twice | EVM uses a `mapping(bytes32 => mapping(bytes32 => bool))`; Solana uses an `init`-once submission PDA |

Read [`interfaces/evm/IBeesiEscrow.sol`](./interfaces/evm/IBeesiEscrow.sol) and the Anchor [IDL](./interfaces/solana/beesi_escrow.idl.json) — the property is visible in the function shapes, not buried in tests.

---

## 2. ⛓️ Symmetric dual-chain mental model

EVM and Solana programs are not *similar*. They are **structurally mirrored**: same task lifecycle (`None → Funded → Closed`), same instruction set (`fund_task`, `approve_submission`, `auto_approve_submission`, `reject_submission`, `refund_remaining`), same event shape, same `(taskKey, submissionKey)` keying scheme.

For an integrator:

- One SDK ergonomic surface — pick a chain via a single `chain` field.
- One indexer schema — events from Base and Solana drop into the same table.
- One verification path — the agent layer doesn't care which chain holds the funds.

This is why `GET /v1/escrow/config?network=` returns either an EVM address or `(programId, mint)` — the **caller-facing** shape is the same.

---

## 3. 🧠 Off-chain verification with on-chain finality

The chain only sees three intents: **approve**, **reject**, **refund**. It does not run OCR, EXIF, or geo math. That's deliberate:

- **Verification gets to evolve.** New evidence types, new heuristics, new vendors — none require a contract upgrade.
- **The chain stays cheap.** `approveSubmission` is the only state-changing tx in the happy path; it's a single transfer pair.
- **Operators are constrained, not trusted.** Operators can *propose* approve/reject; they cannot move funds outside the escrow's pre-locked accounting.

What that buys you, as a builder: a verification stack you can swap modules in without redeploying contracts, and a settlement stack you can audit independently of the verification logic.

---

## 4. 🤖 Agent-first API

beesi.ai is built so a coding agent can integrate end-to-end without reading a tutorial:

- **`GET /openapi.json`** is published on every deploy. Feed it directly to your agent.
- **MCP server** ships a `fund_task_custodial` tool that takes only `task_id` — it fetches the task and escrow config and signs through the platform agent wallet.
- **TypeScript SDK** has `demand.fundTaskFromWallet(taskId)` and `supply.bidAndSubmit(...)` — single-call ergonomics over the same routes.
- **Errors are programmatic.** `4xx` responses include `error`, `code`, `field`, and `details` (Zod flatten output for task routes).

See [`interfaces/api/openapi-summary.md`](./interfaces/api/openapi-summary.md).

---

## 5. 🏆 Bounty-first task economics

Every task is a **bounty** with explicit, on-chain-aware fields:

| Concept | Where it lives |
|---|---|
| Prize pool | `rewardPerCompletion × maxInstances` (escrow) |
| Min / max winners | API task body; max winners maps to `maxInstances` on-chain |
| Distribution | `distribution` + optional `distribution_custom` |
| Evaluation rubric | API task body — feeds the agent layer's verification pipeline |
| Deadline | API task body + `autoApproveAt` on-chain (auto-approve safety net) |

Auto-approve deserves a callout: if an operator never resolves a submission by `autoApproveAt`, an operator can call `autoApproveSubmission` and the chain checks the deadline itself. Performers don't get stuck waiting for a human to click approve.

---

## ⚖️ Trade-offs we did not pretend away

- **Operators have power.** They can approve, reject, or auto-approve. They **cannot** drain escrow, change recipients, or process the same submission twice. We picked operator-mediated rather than fully trustless because verification is hard and disputes need humans.
- **Mainnet waits for an audit.** Both chains. Both at the same time. We will not ship one and ask people to "use the other for now."
- **Off-chain verification is opaque from the chain's view.** That's a feature for evolution and a bug for trust-minimization. Make the trade-off intentionally; we did.
