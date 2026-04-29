# 🧪 Examples

Real, runnable TypeScript samples whose **body shapes match the production routes** (extracted from `apps/api/src/routes/*.ts` and `functions/src/index.ts`). None contain hard-coded secrets; replace the `API_BASE`, RPC URLs, and key sources before running against a real network.

## 📦 Install

```bash
cd examples
pnpm i      # or: npm i / yarn / bun i
```

## 🚀 Scripts

| Script | What it does |
|---|---|
| `pnpm fund:evm` | `src/fund-task-evm.ts` — Path A funding on Base Sepolia using `viem`. Body matches `createTaskSchema`; reads `escrow_task_key` from `GET /v1/tasks/:id`. |
| `pnpm fund:solana` | `src/fund-task-solana.ts` — Path A funding on Solana devnet using `@solana/web3.js` + `@coral-xyz/anchor`. |
| `pnpm bid` | `src/bid-and-submit.ts` — supply-side flow against real routes (`POST /v1/bids` + `POST /v1/submissions`). |
| `pnpm webhook` | `src/webhook-receiver.ts` — Fastify server that verifies HMAC signatures on lifecycle webhooks (refuses to start without `WEBHOOK_HMAC_SECRET`). |
| `pnpm mcp` | `src/mcp-call-tool.ts` — programmatic MCP client invoking `create_task` → `fund_task_custodial` → `natural_language_query`. |
| `pnpm typecheck` | `tsc --noEmit` over `src/` |

## 🔑 Environment

Copy from your own secrets store; **do not** commit `.env`.

```bash
# common
API_BASE=https://<your-deployment>.example
PROJECT_KEY=bprj_xxx                         # from POST /v1/auth/session, or legacy bsk_
CLAW_ID=0xYourEoaOrSolanaPubkey              # demand_claw_id / supplier_claw_id
WEBHOOK_HMAC_SECRET=<required — webhook receiver will refuse to start without this>

# EVM
EVM_RPC_URL=https://sepolia.base.org
EVM_PRIVATE_KEY=0x...

# Solana
SOL_RPC_URL=https://api.devnet.solana.com
SOL_KEYPAIR_JSON=[ ... ]                     # JSON-array form of secret key

# MCP example
BEESI_API_URL=https://api.beesi.ai
BEESI_API_KEY=$PROJECT_KEY
```

`fund-task-evm.ts` and `fund-task-solana.ts` resolve the escrow + token addresses at runtime via `GET /v1/escrow/config` — you do not hard-code them.

## 🤖 MCP — config-only path

If you'd rather drive the protocol through an MCP-aware agent (Cursor, Claude Desktop, etc.), no code is needed. Drop this into your client config:

```jsonc
{
  "mcpServers": {
    "beesi": {
      "command": "beesi-mcp",
      "env": {
        "BEESI_API_URL": "https://api.beesi.ai",
        "BEESI_API_KEY": "bprj_xxx"
      }
    }
  }
}
```

Then ask the agent things like:

- *"Create a bounty task to photograph the snack-aisle planogram at lat 52.5163, lng 13.3777, radius 500m, budget 3.3 USDC, deadline tomorrow."*
- *"Fund task t_abc with my agent wallet."*  → invokes `fund_task_custodial`
- *"Show all my open tasks."*  → invokes `list_tasks` or `natural_language_query`

See [`../interfaces/mcp/tools.md`](../interfaces/mcp/tools.md) for the full tool list with input schemas.

## ⚠️ What these examples do *not* do

- **Production secrets management.** Use a real KMS / HSM for operator keys.
- **Webhook replay protection** beyond HMAC verification — add idempotency keys for production.
- **Full RFQ orchestration** — `bid-and-submit.ts` shows the API shape, not the matching/ranking logic (which lives off-chain in the agent layer).
