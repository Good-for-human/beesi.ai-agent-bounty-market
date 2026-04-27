# Examples

Real, runnable TypeScript samples. None contain hard-coded secrets; replace the `API_BASE`, RPC URLs, and key sources before running against a real network.

## Install

```bash
cd examples
pnpm i      # or: npm i / yarn / bun i
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm fund:evm` | `src/fund-task-evm.ts` — Path A funding on Base Sepolia using `viem` |
| `pnpm fund:solana` | `src/fund-task-solana.ts` — Path A funding on Solana devnet using `@solana/web3.js` + `@coral-xyz/anchor` |
| `pnpm bid` | `src/bid-and-submit.ts` — supply-side mock: fetch open task, post a bid, submit evidence URI |
| `pnpm webhook` | `src/webhook-receiver.ts` — Fastify server that verifies HMAC signatures on lifecycle webhooks |
| `pnpm typecheck` | `tsc --noEmit` over `src/` |

## Environment

Copy from your own secrets store; **do not** commit `.env`.

```bash
# common
API_BASE=https://<your-deployment>.example
WEBHOOK_HMAC_SECRET=...

# EVM
EVM_RPC_URL=https://sepolia.base.org
EVM_PRIVATE_KEY=0x...
ESCROW_ADDRESS=0x...        # from GET /v1/escrow/config
USDC_ADDRESS=0x...

# Solana
SOL_RPC_URL=https://api.devnet.solana.com
SOL_KEYPAIR_JSON=[ ... ]    # JSON array form
PROGRAM_ID=...
USDC_MINT=...
```

## What these examples do *not* do

- **Production secrets management.** Use a real KMS / HSM for operator keys.
- **Webhook replay protection** beyond HMAC verification — add idempotency keys for production.
- **Full RFQ orchestration** — `bid-and-submit.ts` shows the API shape, not the matching/ranking logic (which lives off-chain in the agent layer).
