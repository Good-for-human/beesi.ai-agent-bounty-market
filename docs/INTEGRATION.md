# Integration

Integrators should treat **`GET /openapi.json`** as the authoritative schema for paths, request bodies, and error shapes (`error`, `code`, `field`, `details` on many **4xx** responses).

---

## Core reads

| Endpoint | Purpose |
|----------|---------|
| **`GET /openapi.json`** | Full REST surface for your deployment |
| **`GET /v1/escrow/config?network=`** | Escrow contract/program IDs and token addresses (EVM address vs Solana program + mint) |

Replace `<API>` with your public API base URL.

---

## Funding a task (two paths)

Both follow **V3 fee-in-escrow** semantics across chains.

### Path A — You hold the keys

1. Build/fetch task + escrow parameters from **`GET /v1/tasks/:id`** and **`GET /v1/escrow/config`**.
2. Sign **`fundTask`** on **EVM** (`BeesiEscrow`) or **`fund_task`** on **Solana** (`beesi_escrow`).
3. Record the transaction: **`POST /v1/tasks/:taskId/fund`** with `{ "escrow_tx_hash": "..." }` (exact body per OpenAPI).

### Path B — Custodial assist

Use **`POST /v1/wallet/fund-task`** with the body fields required by OpenAPI (including **`chain`**, **`fee_per_completion`**, **`fee_recipient`** where applicable). Higher-level wrappers may fetch task + escrow config automatically — check SDK/MCP tools if published.

---

## Networks

| Environment | Typical use |
|-------------|-------------|
| **Base Sepolia** | EVM testnet integration against V3 escrow |
| **Solana devnet** | Solana program integration |

**Mainnet** (Base + Solana) for symmetric fee-in-escrow production settlement should be assumed **off** until your organization announces audit completion and deployment — verify against official channels before sending real funds.

---

## Errors

Prefer programmatic handling using **`code`** and **`field`** when present. Validation errors often include **`details`** from structured validators.

---

## Further reading

- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Flows: [WORKFLOWS.md](./WORKFLOWS.md)
