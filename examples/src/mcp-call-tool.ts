/**
 * mcp-call-tool.ts
 *
 * Direct programmatic call into the @beesi/mcp-server tool surface.
 *
 * Most users will invoke beesi MCP tools via Claude Desktop or Cursor's MCP
 * config (see ../README.md). This file shows the alternative — speaking the
 * MCP protocol directly with the official @modelcontextprotocol/sdk client.
 *
 * The same 16 tools (create_task, fund_task_custodial, submit_work, …) are
 * available — see ../../interfaces/mcp/tools.md for the full catalog.
 *
 * To run, install the deps and ensure `beesi-mcp` is on $PATH:
 *
 *   npm install @modelcontextprotocol/sdk
 *   npm install -g @beesi/mcp-server
 *
 *   BEESI_API_URL=https://api.beesi.ai \
 *   BEESI_API_KEY=bprj_xxx \
 *   tsx src/mcp-call-tool.ts
 */

// @ts-expect-error — @modelcontextprotocol/sdk is an optional runtime dep
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// @ts-expect-error — same
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

interface ToolDescriptor {
  name: string;
  description?: string;
}

interface ToolResultBlock {
  type: "text";
  text: string;
}

interface ToolResult {
  content: ToolResultBlock[];
  isError?: boolean;
}

async function main() {
  const transport = new StdioClientTransport({
    command: "beesi-mcp",
    env: {
      ...process.env,
      BEESI_API_URL: process.env.BEESI_API_URL ?? "https://api.beesi.ai",
      BEESI_API_KEY: process.env.BEESI_API_KEY ?? "bprj_DEMO",
    },
  });

  const client = new Client({ name: "beesi-example", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);

  // ── 1. Discover the tool catalog ─────────────────────────────────────────
  const { tools } = (await client.listTools()) as { tools: ToolDescriptor[] };
  console.log(`Discovered ${tools.length} tools`);
  for (const t of tools.slice(0, 5)) {
    console.log(`  • ${t.name} — ${t.description?.slice(0, 60) ?? ""}…`);
  }

  // ── 2. Create a bounty task ──────────────────────────────────────────────
  const created = (await client.callTool({
    name: "create_task",
    arguments: {
      type: "shelf_audit",
      lat: 52.5163,
      lng: 13.3777,
      radius_m: 500,
      amount: "3.3",
      settle_chain: "base-sepolia",
      instructions: "Photograph the snack-aisle planogram",
      artifact_type: "photo",
      artifact_min_count: 1,
      deadline_hours: 24,
      callback_url: "https://your-server.example/beesi-webhook",
    },
  })) as ToolResult;
  if (created.isError) throw new Error(created.content[0]?.text ?? "create_task failed");
  const taskRes = JSON.parse(created.content[0]!.text) as { task_id: string };
  console.log("Created task:", taskRes.task_id);

  // ── 3. Custodial fund — agent passes only task_id ────────────────────────
  const funded = (await client.callTool({
    name: "fund_task_custodial",
    arguments: { task_id: taskRes.task_id },
  })) as ToolResult;
  if (funded.isError) throw new Error(funded.content[0]?.text ?? "fund_task_custodial failed");
  console.log("Funded:", funded.content[0]!.text);

  // ── 4. Free-text fallback (multi-language) ───────────────────────────────
  const nl = (await client.callTool({
    name: "natural_language_query",
    arguments: { text: "show me my recent tasks and which are still open" },
  })) as ToolResult;
  console.log("NL response:", nl.content[0]!.text);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
