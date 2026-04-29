# 🤖 `@beesi/mcp-server` — Tools

Source of truth: `packages/mcp-server/src/server.ts` and `packages/mcp-server/src/tools/*.ts`.

The MCP server registers **16 tools** across 7 categories. Each tool's `inputSchema` is a JSON Schema object generated directly from the tool source files; the snippets below are extracted from production code.

| Category | Tools |
|---|---|
| Tasks | `list_tasks`, `get_task`, `create_task`, `claim_task` |
| Submissions | `submit_work`, `list_submissions`, `get_submission` |
| Decisions | `approve_submission`, `reject_submission`, `evaluate_bounty`, `refund_task` |
| Bids | `list_bids`, `submit_bid`, `select_bid`, `fund_task` |
| Wallet | `provision_wallet`, `get_wallet`, `fund_task_custodial` |
| Suppliers | `get_supplier`, `register_supplier` |
| Natural language | `natural_language_query` |

## Quick start

```bash
# Install
npm install -g @beesi/mcp-server

# Run
BEESI_API_URL=https://api.beesi.ai \
BEESI_API_KEY=bsk_your_key \
beesi-mcp
```

It speaks **stdio MCP** (`@modelcontextprotocol/sdk`), so it plugs into any MCP-compatible client (Claude Desktop, Cursor, etc.). Server identity:

```ts
new McpServer({ name: "beesi", version: "0.2.0" });
```

---

## Tasks

### `create_task`

```jsonc
{
  "name": "create_task",
  "description": "Create a new bounty task. Requires type, location, budget, requirements, deadline, and callback URL.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": ["price_check","shelf_audit","store_presence","foot_traffic",
                 "signage_check","menu_capture","construction_check",
                 "event_proof","service_check","custom"]
      },
      "lat": { "type": "number" },
      "lng": { "type": "number" },
      "radius_m": { "type": "number" },
      "address": { "type": "string" },
      "amount": { "type": "string", "description": "Budget in USDC, e.g. '5.0'" },
      "settle_chain": { "type": "string", "enum": ["base","base-sepolia"] },
      "instructions": { "type": "string" },
      "artifact_type": { "type": "string", "enum": ["photo","video","audio","document","json"] },
      "artifact_min_count": { "type": "number" },
      "deadline_hours": { "type": "number", "default": 24 },
      "callback_url": { "type": "string" }
    },
    "required": ["type","lat","lng","radius_m","amount","instructions","callback_url"]
  }
}
```

Routes to `POST /v1/agent/execute` with `intent: "publish_task"`.

### `list_tasks`

```jsonc
{
  "inputSchema": {
    "properties": {
      "status": {
        "enum": ["pending","funded","open","assigned","in_progress","submitted",
                 "approved","released","evaluating","rejected","refunded","cancelled"]
      },
      "near_lat": { "type": "number" },
      "near_lng": { "type": "number" },
      "near_radius_m": { "type": "number" }
    }
  }
}
```

### `get_task`, `claim_task`

```jsonc
{ "name": "get_task",   "inputSchema": { "required": ["task_id"] } }
{ "name": "claim_task", "inputSchema": { "required": ["task_id"] } }
```

---

## Submissions

### `submit_work`

```jsonc
{
  "inputSchema": {
    "properties": {
      "task_id": { "type": "string" },
      "artifact_uri": { "type": "string", "description": "S3/R2/IPFS URI" },
      "artifact_type": { "enum": ["photo","video","audio","document","json"] },
      "artifact_sha256": { "type": "string", "description": "SHA-256 hex (64 chars)" },
      "note": { "type": "string" }
    },
    "required": ["task_id","artifact_uri","artifact_type","artifact_sha256"]
  }
}
```

`list_submissions` (`{ task_id }`) and `get_submission` (`{ submission_id }`) return raw `/v1/...` payloads.

---

## Decisions

```ts
approve_submission   { task_id, submission_id }   // triggers on-chain settlement
reject_submission    { task_id, submission_id }
evaluate_bounty      { task_id }                  // bounty mode — close + score + distribute
refund_task          { task_id }
```

All four route to `POST /v1/agent/execute` with corresponding `intent` strings.

---

## Bids

```ts
list_bids   { task_id }
submit_bid  { task_id, rfq_id, price, eta_minutes, device_capabilities? }
select_bid  { bid_id }
fund_task   { task_id, escrow_tx_hash }       // Path A — record an on-chain fundTask
```

`fund_task` is a thin wrapper over `POST /v1/tasks/:taskId/fund`.

---

## Wallet — `fund_task_custodial`

This is the **agent-friendly one-shot** — pass only `task_id` and the tool fetches everything else and signs through the platform agent wallet.

```jsonc
{
  "name": "fund_task_custodial",
  "description":
    "V3 fee-in-escrow custodial fund: lock (reward+fee)*max in the task's escrow using the beesi-managed agent wallet. Works for both EVM (Base) and Solana — the API routes by `chain`.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "task_id": { "type": "string" },
      "network": {
        "type": "string",
        "enum": ["base","base-sepolia","solana","solana-devnet"]
      },
      "auto_approve_at_override": {
        "type": "number",
        "description": "Unix seconds — defaults to task.deadline."
      }
    },
    "required": ["task_id"]
  }
}
```

What the tool does (verbatim from `tools/wallet.ts`):

1. `GET /v1/tasks/:task_id` — fetches `escrow_task_key`, `reward_per_completion_raw`, `fee_per_completion_raw`, `fee_recipient`, `deadline`, `budget`, `bounty`.
2. Resolves `network` from `args.network ?? task.budget.settle_chain ?? "base"`.
3. `GET /v1/escrow/config?network=…` — pulls `escrow_address` + `token_address`.
4. Derives `max_instances = max(1, floor(bounty.max_winners ?? 1))`.
5. Derives `reward_per_completion`:
   - prefer `task.reward_per_completion_raw` (already base units);
   - else parses `task.budget.amount` as USDC decimal → `(reward + fee) total / max_instances`.
6. `auto_approve_at = args.auto_approve_at_override ?? task.deadline`.
7. `POST /v1/wallet/fund-task` with the assembled body.

The body posted is exactly:

```jsonc
{
  "chain": "base-sepolia",
  "token_address": "0x036C…",
  "escrow_address": "0x…",
  "task_key": "0x<32-byte hex>",
  "reward_per_completion": "1000000",
  "fee_per_completion":   "100000",
  "max_instances": 3,
  "fee_recipient": "0x…",
  "auto_approve_at": 1761600000
}
```

Other wallet tools:

```ts
provision_wallet { network?: "base" | "base-sepolia" | "solana" | "solana-devnet" }
get_wallet       {}
```

Both call `POST /v1/agent/execute` (`intent: "provision_wallet"` / `"get_wallet"`).

---

## Suppliers

```jsonc
{ "name": "get_supplier",      "inputSchema": { "required": ["supplier_id"] } }
{
  "name": "register_supplier",
  "inputSchema": {
    "required": ["wallet_address","has_camera","has_gps","has_microphone","languages","coverage_regions"],
    "properties": {
      "languages":        { "type": "array", "items": { "type": "string" }, "description": "ISO 639-1" },
      "coverage_regions": { "type": "array", "items": { "type": "string" }, "description": "ISO 3166-1 alpha-2" }
    }
  }
}
```

---

## Natural language — `natural_language_query`

Free-text fallback. Any language; the platform NL endpoint interprets and dispatches to a concrete tool/intent.

```jsonc
{
  "name": "natural_language_query",
  "inputSchema": {
    "properties": { "text": { "type": "string" } },
    "required": ["text"]
  }
}
```

Routes to `POST /v1/nl`.

---

## Cursor / Claude Desktop config

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "beesi": {
      "command": "beesi-mcp",
      "env": {
        "BEESI_API_URL": "https://api.beesi.ai",
        "BEESI_API_KEY": "bsk_your_key"
      }
    }
  }
}
```

The server enforces both env vars at startup and exits with a clear message if either is missing.
