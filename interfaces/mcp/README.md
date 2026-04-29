# 🤖 MCP — `@beesi/mcp-server`

The Model Context Protocol surface. Lets any MCP-compatible agent (Claude Desktop, Cursor, custom clients) drive beesi end-to-end through tool calls — no need to write HTTP clients.

| File | Contents |
|---|---|
| [`tools.md`](./tools.md) | All 16 tools with real JSON Schemas and request bodies |

## Quick start

```bash
npm install -g @beesi/mcp-server

BEESI_API_URL=https://api.beesi.ai \
BEESI_API_KEY=bsk_your_key \
beesi-mcp
```

## What it gives an agent

- **`fund_task_custodial`** — agent passes only `task_id`; the tool reads the task, escrow config, derives V3 fields, and funds via the platform agent wallet.
- **`natural_language_query`** — free-text fallback for any language.
- Full task lifecycle (create → fund → bid → submit → approve/reject → evaluate → refund) without writing a single HTTP request.

See [`tools.md`](./tools.md) for the full tool catalog with input schemas.
