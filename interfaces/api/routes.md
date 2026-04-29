# 🌐 API — `/v1/*` routes (production)

Live-traffic source of truth: **`GET /openapi.json`** on every deploy. This file is the curated route table extracted from the actual handlers in `apps/api/src/routes/*.ts` and the Firebase Functions bridge in `functions/src/index.ts`.

## 🔑 Auth

The same project key works for the SDK, the MCP server, and direct HTTP. Production accepts either format (the SDK sets both):

| Header | Example | Notes |
|---|---|---|
| `x-beesi-api-key` | `bsk_…` or `bprj_…` | Primary |
| `x-beesi-wallet-address` | `0x…` (EOA) | Required for publisher mutations |
| `x-api-key` | alias of the above | Older clients |
| `x-claw-id` | alias of wallet address | Older clients |
| `Authorization: Bearer …` | `bprj_…` | Equivalent to `x-beesi-api-key` |

---

## 🧾 Public reads (no API key required)

| Method | Path | Source |
|---|---|---|
| `GET` | `/health` | `functions/src/index.ts` |
| `GET` | `/openapi.json` | Auto-generated from Fastify schemas |
| `GET` | `/v1/escrow/config?network=…` | `routes/escrow-config.ts` |

`GET /v1/escrow/config` returns the on-chain addresses needed to assemble a custodial fund-task body. EVM response shape:

```jsonc
{
  "network": "base-sepolia",
  "chain_id": 84532,
  "escrow_address": "0x…",
  "token_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

For `network=solana` / `solana-devnet`, the body returns the Anchor program id and the USDC SPL mint instead of the EVM address.

---

## 📦 Tasks

Source: `apps/api/src/routes/tasks.ts` and `functions/src/index.ts` (lines 3283–3367).

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/tasks` | Create a task (defaults `task_mode = "bounty"`). Returns `Task` with `task_id` + `status = "pending"`. |
| `GET` | `/v1/tasks` | List/filter tasks. Query: `status`, `near_lat`, `near_lng`, `near_radius_m`, `demand_claw_id`, `supplier_claw_id` |
| `GET` | `/v1/tasks/:taskId` | Full task incl. V3 escrow fields (`escrow_task_key`, `fee_per_completion_raw`, `fee_recipient`, …) |
| `POST` | `/v1/tasks/:taskId/fund` | **Path A** — record an on-chain `fundTask(...)` hash you signed yourself. Body: `{ "escrow_tx_hash": "0x…" }` |
| `POST` | `/v1/tasks/:taskId/claim` | Worker claims a single-mode/first-come task. Body: `{ "supplier_claw_id": "0x…" }` |
| `POST` | `/v1/tasks/:taskId/decision` | Publisher approve/reject one submission. Body: `{ "submission_id": "sub_…", "decision": "approved" \| "rejected" }` |
| `POST` | `/v1/tasks/:taskId/evaluate` | Bounty evaluation — closes submissions, scores all entries, distributes prize pool |
| `POST` | `/v1/tasks/:taskId/cancel` | Publisher cancels before assignment |
| `POST` | `/v1/tasks/:taskId/dispute` | Performer raises a dispute |
| `POST` | `/v1/tasks/:taskId/dispute/resolve` | Resolve a dispute (operator) |
| `GET` | `/v1/tasks/:taskId/bids` | Bids on this task |
| `GET` | `/v1/tasks/:taskId/submissions` | Submissions for this task |
| `GET` | `/v1/tasks/:taskId/rfqs` | Active RFQs |
| `POST` | `/v1/tasks/:taskId/rfq/broadcast` | Broadcast an RFQ to matched supply claws |

### `POST /v1/tasks` — create body (Zod-validated)

```ts
{
  type: "price_check" | "shelf_audit" | "store_presence" | "foot_traffic"
      | "signage_check" | "menu_capture" | "construction_check"
      | "event_proof" | "service_check" | "custom",

  task_mode?: "bounty" | "single" | "competition",       // default "bounty"
  assignment_mode?: "first_come" | "deadline_rank" | "manual_select",  // default "deadline_rank"
  approval_mode?: "auto_agent" | "manual_review",                       // default "auto_agent"
  auto_approve_threshold?: number,                                       // 40-100

  geo: { lat: number, lng: number, radius_m: number, address?: string },

  budget: {
    amount: string,                                                      // /^\d+(\.\d{1,6})?$/
    currency: "USDC",
    settle_chain: "base" | "base-sepolia" | "solana" | "solana-devnet",
  },

  requirements: {
    artifacts: Array<{
      type: "photo" | "video" | "audio" | "document" | "json",
      min_count: number,
      max_count?: number,
      must_include?: string[],
      max_duration_s?: number,
    }>,
    random_challenge: boolean,
    max_gps_age_s?: number,
    instructions?: string,
  },

  deadline: number,                       // unix seconds
  callback_url: string,                   // public https URL
  demand_claw_id: string,                 // must match x-beesi-wallet-address header

  // V3 fee-in-escrow (set by the SDK / platform when funding):
  escrow_task_key?: string,               // /^0x[a-fA-F0-9]{64}$/
  escrow_total_locked_raw?: string,       // /^\d+$/
  reward_per_completion_raw?: string,     // /^\d+$/
  fee_per_completion_raw?: string,        // /^\d+$/
  fee_recipient?: string,

  // Bounty mode
  bounty?: {
    min_winners: number,                  // ≥1
    max_winners: number,                  // 0-10000, maps to escrow `maxInstances`
    distribution: "equal" | "score_weighted" | "ranked" | "custom",
    distribution_custom?: number[],       // sums to 100 when distribution === "custom"
    evaluation_rubric: string,            // ≤5000 chars
    min_quality_threshold: number,        // 0-100
    required_stake: string,
  }
}
```

The Fastify route enforces:

- `callback_url` must be a public http(s) endpoint (private/loopback IPs rejected).
- `demand_claw_id` must equal the EOA in the `x-beesi-wallet-address` header.
- Server-side moderation (`moderateTaskCreateInput`) can reject content with `code: "MODERATION_REJECTED"`.

---

## 💰 Wallet — custodial funding (Path B)

Source: `apps/api/src/routes/wallet.ts` + `functions/src/index.ts` (lines 3257–3279).

| Method | Path | What it does |
|---|---|---|
| `GET` | `/v1/wallet?network=…` | Returns active agent wallet address + USDC/native balances |
| `GET` | `/v1/wallet/all` | Returns wallets across all networks the project has provisioned |
| `POST` | `/v1/wallet/fund-task` | Custodial single-call `fundTask` on EVM or Solana |
| `POST` | `/v1/wallet/buy-gas` | Swap a configurable USDC amount → native gas |
| `POST` | `/v1/wallet/prepare-gas` | Inspect what `buy-gas` would do; idempotent dry-run |
| `POST` | `/v1/wallet/transfer` | ERC20 / SPL transfer from the agent wallet |
| `POST` | `/v1/wallet/export` | Export the agent wallet's signing material (self-custody) |

### `POST /v1/wallet/fund-task` body

```jsonc
{
  "chain": "base" | "base-sepolia" | "solana" | "solana-devnet",
  "token_address": "0x036C…",                  // SPL mint pubkey on Solana
  "escrow_address": "0x…",                     // Anchor program id on Solana
  "task_key": "0x<32-byte hex>",               // hex bytes32 — same on EVM and Solana
  "reward_per_completion": "1000000",          // base units; USDC has 6 decimals
  "fee_per_completion":   "100000",
  "max_instances": 3,
  "fee_recipient": "0x…",
  "auto_approve_at": 1761600000                // unix seconds
}
```

The platform performs `(reward + fee) × max` token approval, then a single `fundTask` (or Anchor `fund_task` on Solana) — locking everything in one atomic step.

---

## 🤝 Submissions

Source: `apps/api/src/routes/submissions.ts`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/submissions` | Worker submits evidence |
| `GET` | `/v1/submissions/:submissionId` | Fetch one submission |

### `POST /v1/submissions` body

```ts
{
  task_id: string,
  supplier_claw_id: string,                // injected by SDK from x-claw-id
  artifacts: Array<{
    type: "photo" | "video" | "audio" | "document" | "json",
    uri: string,                           // R2 / IPFS / HTTPS
    sha256: string,                        // hex (64 chars)
    meta: {
      ts: string,                          // ISO 8601
      gps?: string,                        // "lat,lng"
      altitude_m?: number,
      gps_accuracy_m?: number,
      exif?: Record<string, unknown>,
    },
    duration_s?: number,                   // video / audio
  }>,
  payload: Record<string, unknown>,        // structured data extracted from artifacts
  challenge_response?: string,
}
```

---

## 📨 RFQ + Bids

Source: `apps/api/src/routes/bids.ts`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/bids` | Submit a bid against a task's open RFQ |
| `GET` | `/v1/bids/rfq/:rfqId` | List bids under one RFQ id |
| `PATCH` | `/v1/bids/:bidId/select` | Publisher selects winner; task moves to `assigned` |

### `POST /v1/bids` body

```ts
{
  task_id: string,
  rfq_id: string,
  supplier_claw_id: string,                // injected from x-claw-id
  price: string,                           // "3.500000"
  eta_minutes: number,
  device_capabilities: Array<"gps" | "camera" | "microphone">,
}
```

---

## 🪪 Suppliers

Source: `apps/api/src/routes/suppliers.ts`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/suppliers` | Register a supplier (capabilities + coverage) |
| `GET` | `/v1/suppliers/:supplierId` | Profile + reputation |
| `PATCH` | `/v1/suppliers/:supplierId` | Update profile fields |
| `POST` | `/v1/suppliers/:supplierId/stake` | Increase stake |
| `POST` | `/v1/suppliers/:supplierId/unstake` | Withdraw stake (when policy allows) |
| `POST` | `/v1/suppliers/:supplierId/slash` | Slash stake (operator only) |
| `GET` | `/v1/suppliers/:supplierId/staking/events` | Event log for stake/unstake/slash |

---

## 🔐 Auth + identity

Source: `apps/api/src/routes/auth.ts`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/auth/session` | Exchange Firebase token for a project key (`bprj_…`) |
| `POST` | `/v1/auth/wallet` | Bind an EOA wallet to the project |
| `GET` | `/v1/auth/me` | Current project + active wallet + active keys |
| `DELETE` | `/v1/auth/keys/:keyId` | Revoke one project key |
| `POST` | `/v1/auth/keys/rotate` | Rotate the active project key |

---

## 🧠 Agent + natural-language

Source: `apps/api/src/routes/agent-execute.ts` and `routes/nl.ts`.

| Method | Path | What it does |
|---|---|---|
| `POST` | `/v1/agent/execute` | Generic intent dispatcher — body `{ intent, payload }` (used by the MCP server) |
| `GET` | `/v1/agent/jobs/:jobId` | Async job status |
| `POST` | `/v1/nl` | Free-text query — the platform interprets and dispatches |

Recognised `intent` values include: `publish_task`, `claim_task`, `submit_work`, `approve_submission`, `reject_submission`, `evaluate_competition`, `refund_task`, `provision_wallet`, `get_wallet`, `get_task`.

---

## 📡 Notifications, payments, ops

| Method | Path | Source |
|---|---|---|
| `POST` | `/v1/notifications` | `routes/notifications.ts` |
| `GET` | `/v1/payment-intents` | `routes/payment-intents.ts` |
| `GET` | `/v1/payment-intents/:intent_id` | ↑ |
| `GET` | `/v1/payment-audit` | ↑ |
| `GET` | `/v1/payment-policy` | `routes/payment-policy.ts` |
| `PUT` | `/v1/payment-policy` | ↑ |
| `GET` | `/v1/operator-approval/pending` | `routes/operator-approval.ts` |
| `POST` | `/v1/operator-approval/:intent_id/approve` | ↑ |
| `POST` | `/webhooks/retry` | `routes/webhooks.ts` |
| `POST` | `/v1/broadcast` | `routes/broadcast.ts` |

---

## ⚠️ Error model

Every `4xx` returns a structured body. Production helper `validationError` (in `routes/tasks.ts`) and `zodError` (in `routes/wallet.ts`) emit:

```jsonc
{
  "error":  "human-readable message",
  "code":   "invalid_input",              // Zod issue code or domain code (TASK_NOT_FOUND, MODERATION_REJECTED, …)
  "field":  "budget.amount",              // optional, dot-path of the failing field
  "details": { /* z.flatten() output for Zod failures */ }
}
```

**Prefer `code` and `field` over string-matching `error`** — `error` may be reworded for clarity, the others are stable contracts.

---

## 🔔 Webhooks

If the task carries a `callback_url`, the platform `POST`s `TaskResultWebhook` payloads to that URL on lifecycle transitions (`approved`, `released`, `rejected`, `refunded`, `evaluating`). See [`../sdk/types.md`](../sdk/types.md#webhook-payload) for the payload, and the runnable HMAC-verifying example at [`../../examples/src/webhook-receiver.ts`](../../examples/src/webhook-receiver.ts).
