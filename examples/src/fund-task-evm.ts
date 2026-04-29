/**
 * fund-task-evm.ts
 *
 * Path A funding on Base (Sepolia) using viem.
 *
 * Mirrors the real production routes (apps/api/src/routes/tasks.ts &
 * functions/src/index.ts) — body shapes match the Zod schemas served by
 * /v1/tasks and /v1/escrow/config in production.
 *
 *   1. POST /v1/tasks               — create the task off-chain
 *   2. GET  /v1/escrow/config       — resolve escrow + token addresses
 *   3. GET  /v1/tasks/:taskId       — read the canonical `escrow_task_key`
 *   4. ERC20 approve                — (reward + fee) * max
 *   5. BeesiEscrow.fundTask(...)    — single atomic lock
 *   6. POST /v1/tasks/:taskId/fund  — record the on-chain hash
 */

import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const RPC_URL = process.env.EVM_RPC_URL ?? "https://sepolia.base.org";
const PRIVATE_KEY = (process.env.EVM_PRIVATE_KEY ?? "0x") as `0x${string}`;
const PROJECT_KEY = process.env.PROJECT_KEY ?? "bprj_DEMO";

function authHeaders(walletAddress: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-beesi-api-key": PROJECT_KEY,
    "x-beesi-wallet-address": walletAddress,
  };
}

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const ESCROW_ABI = [
  {
    type: "function",
    name: "fundTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskKey", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "rewardPerCompletion", type: "uint256" },
      { name: "feePerCompletion", type: "uint256" },
      { name: "maxInstances", type: "uint32" },
      { name: "feeRecipient", type: "address" },
      { name: "autoApproveAt", type: "uint64" },
    ],
    outputs: [],
  },
] as const;

interface TaskResponse {
  task_id: string;
  escrow_task_key?: string;
  fee_recipient?: string;
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  // ── 1. Create task ────────────────────────────────────────────────────────
  // Body matches createTaskSchema in apps/api/src/routes/tasks.ts.
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const createBody = {
    type: "shelf_audit",
    task_mode: "bounty",
    geo: { lat: 52.5163, lng: 13.3777, radius_m: 500 },
    budget: {
      amount: "3.300000",
      currency: "USDC",
      settle_chain: "base-sepolia",
    },
    requirements: {
      artifacts: [{ type: "photo", min_count: 1 }],
      random_challenge: false,
      instructions: "Photograph the snack-aisle planogram, eye-level shelf",
    },
    deadline,
    callback_url: "https://your-server.example/beesi-webhook",
    demand_claw_id: account.address,
    bounty: {
      min_winners: 1,
      max_winners: 3,
      distribution: "ranked",
      evaluation_rubric: "Sharpness 30 / coverage 50 / metadata 20",
      min_quality_threshold: 60,
      required_stake: "0",
    },
  };
  const created = (await fetch(`${API_BASE}/v1/tasks`, {
    method: "POST",
    headers: authHeaders(account.address),
    body: JSON.stringify(createBody),
  }).then((r) => r.json())) as TaskResponse;
  const taskId = created.task_id;

  // ── 2. Escrow + token addresses ──────────────────────────────────────────
  const cfg = (await fetch(
    `${API_BASE}/v1/escrow/config?network=base-sepolia`
  ).then((r) => r.json())) as {
    escrow_address: `0x${string}`;
    token_address: `0x${string}`;
  };

  // ── 3. Canonical taskKey ─────────────────────────────────────────────────
  // The platform writes `escrow_task_key` onto the Task during creation.
  // Read it back rather than deriving it locally — the algorithm is an
  // internal detail that may change between deploys.
  const fullTask = (await fetch(`${API_BASE}/v1/tasks/${taskId}`, {
    headers: authHeaders(account.address),
  }).then((r) => r.json())) as TaskResponse;
  if (!fullTask.escrow_task_key) {
    throw new Error(`Task ${taskId} has no escrow_task_key — was creation moderated out?`);
  }
  const taskKey = fullTask.escrow_task_key as `0x${string}`;
  const feeRecipient = (fullTask.fee_recipient ?? account.address) as `0x${string}`;

  // ── 4. Approve allowance for (reward + fee) * max ────────────────────────
  const reward = parseUnits("1", 6);
  const fee = parseUnits("0.1", 6);
  const max = 3;
  const total = (reward + fee) * BigInt(max);

  const approveTx = await walletClient.writeContract({
    address: cfg.token_address,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [cfg.escrow_address, total],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // ── 5. fundTask ──────────────────────────────────────────────────────────
  const fundTx = await walletClient.writeContract({
    address: cfg.escrow_address,
    abi: ESCROW_ABI,
    functionName: "fundTask",
    args: [
      taskKey,
      cfg.token_address,
      reward,
      fee,
      max,
      feeRecipient,
      BigInt(deadline),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });

  // ── 6. Record on the platform (Path A) ───────────────────────────────────
  await fetch(`${API_BASE}/v1/tasks/${taskId}/fund`, {
    method: "POST",
    headers: authHeaders(account.address),
    body: JSON.stringify({ escrow_tx_hash: fundTx }),
  });

  console.log({ taskId, fundTx });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
