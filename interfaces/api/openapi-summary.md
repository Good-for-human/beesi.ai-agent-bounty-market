# API summary

The authoritative schema is **`GET /openapi.json`** on every deployment. This file is a curated overview of the surface integrators reach for most.

## Public reads

| Method | Path | Description |
|---|---|---|
| GET | `/openapi.json` | Full machine-readable spec |
| GET | `/v1/escrow/config` | Escrow + token addresses; pass `?network=base-sepolia` / `solana-devnet` / `base` / `solana` |
| GET | `/v1/tasks/:id` | Task spec, status, lifecycle timestamps |

`GET /v1/escrow/config` returns either:

```json
{ "chain": "base-sepolia", "escrow_address": "0x...", "token_address": "0x...USDC" }
```

or, for Solana:

```json
{ "chain": "solana-devnet", "program_id": "...", "token_mint": "...USDC SPL" }
```

## Tasks

| Method | Path | Description |
|---|---|---|
| POST | `/v1/tasks` | Create task. Defaults `task_mode = bounty`. Returns `task_id`, status `pending` |
| POST | `/v1/tasks/:taskId/fund` | Path A: record an on-chain `fundTask` tx hash you signed yourself |
| GET | `/v1/tasks/:id/submissions` | List submissions for a task |
| POST | `/v1/tasks/:id/submit` | Performer submits evidence |

`POST /v1/tasks/:taskId/fund` body:

```json
{ "escrow_tx_hash": "0x..." }
```

## Custodial funding (Path B)

| Method | Path | Description |
|---|---|---|
| POST | `/v1/wallet/fund-task` | Custodial one-shot via the platform agent wallet |

Body fields include (full schema in `openapi.json`):

```jsonc
{
  "task_id": "...",
  "chain": "base-sepolia",      // or "solana-devnet" / "base" / "solana"
  "token_address": "0x...",     // mint pubkey for Solana
  "reward_per_completion": "1000000",   // 1 USDC (6 decimals)
  "fee_per_completion": "100000",
  "max_instances": 5,
  "fee_recipient": "0x...",
  "auto_approve_at": 1761600000
}
```

SDK and MCP wrappers fetch these for you:

- TypeScript SDK: `await demand.fundTaskFromWallet(taskId)`
- MCP tool: `fund_task_custodial({ task_id })`

## Auth

When `API_KEY_ENFORCE=true`, mutating `/v1/*` requires one of:

| Mode | Header(s) |
|---|---|
| Project key (recommended) | `Authorization: Bearer bprj_...` (from `POST /v1/auth/session`) |
| Legacy bsk + wallet | `x-beesi-api-key: bsk_...`, `x-beesi-wallet-address: 0x...` (or `x-claw-id`) |

## Error model

`4xx` responses carry a structured body:

```jsonc
{
  "error": "human-readable message",
  "code": "TASK_NOT_FOUND",        // optional, programmatic
  "field": "task_id",              // optional, when relevant
  "details": { /* Zod flatten() */ } // optional, validation errors
}
```

Always prefer `code` and `field` over string-matching `error`.

## Webhooks

Tasks can carry a `callback_url`. The platform `POST`s lifecycle events (`funded`, `assigned`, `submitted`, `approved`, `released`, `rejected`, `refunded`) to that URL with HMAC-signed payloads. See `examples/webhook-receiver.ts`.
