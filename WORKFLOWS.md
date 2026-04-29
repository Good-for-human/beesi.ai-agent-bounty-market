# 🔄 Workflows

Five flows worth understanding — happy path, reject, refund, RFQ, and auto-approve. Each works identically on **Base** and **Solana**; the only difference is the signing surface.

---

## 1. ✅ Happy path — fund → assign → approve

```mermaid
sequenceDiagram
  autonumber
  participant Pub as 📢 Publisher
  participant API as 🖥️ Platform API
  participant Agent as 🧠 Agent Layer
  participant Sup as 🧑 Performer
  participant Chain as ⛓️ Escrow (Base or Solana)

  Pub->>API: POST /v1/tasks (bounty spec)
  API-->>Pub: task_id (state=pending)
  Pub->>Chain: fundTask(taskKey, token, reward, fee, max, feeRecipient, autoApproveAt)
  Chain-->>API: TaskFunded event
  API->>API: state → funded → open
  Sup->>Agent: bid via SupplyClaw SDK
  Agent->>Sup: assigned
  Sup->>Agent: submit (evidence URIs)
  Agent->>Agent: verify (OCR · GPS · EXIF · cross-source)
  Agent->>Chain: approveSubmission(taskKey, submissionKey, performer)
  Chain-->>Sup: reward (USDC) 💸
  Chain-->>Pub: fee → feeRecipient (USDC)
  Chain-->>API: SubmissionApproved event
  API->>Pub: webhook to callback_url
```

Key invariants:

- `(taskKey, submissionKey)` is processed **at most once**.
- Reward and fee transfer in the **same on-chain instruction**. No partial state.
- The task auto-closes when `releasedCount == maxInstances`.

---

## 2. ❌ Reject

```mermaid
sequenceDiagram
  participant Sup as 🧑 Performer
  participant Agent as 🧠 Agent Layer
  participant Chain as ⛓️ Escrow

  Sup->>Agent: submit (low-quality evidence)
  Agent->>Agent: verify → reject
  Agent->>Chain: rejectSubmission(taskKey, submissionKey)
  Chain-->>Agent: SubmissionRejected event
  Note over Chain: No funds move. Slot is NOT consumed —<br/>another performer can still earn it.
```

**A reject does not consume an instance.** The task continues until `releasedCount == maxInstances` or `refundRemaining` is called.

---

## 3. ↩️ Refund — "未完成不收费" enforced on-chain

```mermaid
sequenceDiagram
  participant Pub as 📢 Publisher
  participant Op as 🔑 Operator
  participant Chain as ⛓️ Escrow

  Note over Pub,Chain: deadline reached or task ended early
  Op->>Chain: refundRemaining(taskKey)
  Chain->>Chain: remaining = totalFunded - totalReleased - totalRefunded
  Chain-->>Pub: remaining USDC 💸
  Note over Chain: Returns reward + fee components for every<br/>unreleased slot. Platform never collects fee for<br/>work that never shipped.
```

Allowed **even when the contract is paused** — locked publisher funds are never trapped.

---

## 4. 🏷️ RFQ / auction (off-chain)

```mermaid
sequenceDiagram
  participant Pub as 📢 Publisher
  participant API as 🖥️ Platform API
  participant M as 🔍 Matching
  participant B as ⚖️ Bidding
  participant Sup as 🧑 Suppliers

  Pub->>API: POST /v1/tasks (bounty spec)
  API->>M: normalized task
  M->>B: candidate set (geo · reputation)
  B->>Sup: RFQ window opens
  Sup-->>B: bids (price · ETA · capacity)
  B->>B: rank by ranker (price · reputation · history)
  B->>API: winner(s) up to max_winners
  API->>Sup: assigned ✅
```

RFQ state lives in **Redis** during the window; the winner persists to Postgres. The chain sees only the eventual `approveSubmission` calls.

---

## 5. ⏰ Auto-approve — performers don't get stuck

```mermaid
sequenceDiagram
  participant Sched as ⏰ Auto-approve scheduler
  participant Op as 🔑 Operator (signer)
  participant Chain as ⛓️ Escrow

  Note over Sched: cron checks tasks where now ≥ autoApproveAt
  Sched->>Op: queue autoApproveSubmission(taskKey, submissionKey, performer)
  Op->>Chain: autoApproveSubmission(...)
  Chain->>Chain: require block.timestamp ≥ autoApproveAt
  Chain-->>Op: SubmissionApproved(autoApproved=true) ✅
```

The chain **double-checks** the deadline itself — even an over-eager scheduler can't approve early. This is why `autoApproveAt` is a required, non-zero field on `fundTask`.

---

## 💡 Two paths to fund (same outcome)

| Path | Who signs | When to use |
|---|---|---|
| **A — direct** | Publisher | You hold keys, you sign `fundTask` yourself, then `POST /v1/tasks/:id/fund` with the tx hash |
| **B — custodial** | Platform agent wallet | `POST /v1/wallet/fund-task` or SDK `demand.fundTaskFromWallet(taskId)` — one call, platform handles signing |

The on-chain effect is identical. Path B is what the MCP server's `fund_task_custodial` tool wraps.

See [`interfaces/api/routes.md`](./interfaces/api/routes.md) for exact request bodies.
