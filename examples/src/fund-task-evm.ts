/**
 * fund-task-evm.ts
 *
 * Path A funding on Base (Sepolia) using viem.
 * Steps:
 *   1. Create the task off-chain (`POST /v1/tasks`) → returns task_id.
 *   2. Resolve escrow + token addresses (`GET /v1/escrow/config`).
 *   3. Compute taskKey = keccak256(task_id) (this matches the platform's convention; confirm
 *      against your deployment's actual derivation if it has changed).
 *   4. Approve USDC allowance to the escrow (one-time per token + spender).
 *   5. Call BeesiEscrow.fundTask(...) with (rewardPerCompletion + feePerCompletion) * maxInstances
 *      already approved.
 *   6. Record the tx hash via `POST /v1/tasks/:taskId/fund`.
 *
 * Replace placeholder env values before running.
 */

import { createPublicClient, createWalletClient, http, parseUnits, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const RPC_URL = process.env.EVM_RPC_URL ?? "https://sepolia.base.org";
const PRIVATE_KEY = (process.env.EVM_PRIVATE_KEY ?? "0x") as `0x${string}`;

const ERC20_ABI = [
  { type: "function", name: "approve",
    inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }],
    stateMutability: "nonpayable" },
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

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC_URL) });

  // 1. Create task
  const created = await fetch(`${API_BASE}/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Onchain capture: a coffee shop near Brandenburg Gate",
      task_mode: "bounty",
      reward_per_completion: "1000000",
      fee_per_completion: "100000",
      max_instances: 3,
      auto_approve_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      callback_url: undefined,
    }),
  }).then((r) => r.json());

  const taskId: string = created.task_id;

  // 2. Escrow + token
  const cfg = await fetch(
    `${API_BASE}/v1/escrow/config?network=base-sepolia`
  ).then((r) => r.json());
  const escrow = cfg.escrow_address as `0x${string}`;
  const usdc = cfg.token_address as `0x${string}`;

  // 3. taskKey (illustrative — confirm derivation against your deployment)
  const taskKey = keccak256(toHex(taskId));

  // 4. Approve allowance for (reward + fee) * max
  const reward = parseUnits("1", 6);   // USDC has 6 decimals
  const fee = parseUnits("0.1", 6);
  const max = 3;
  const total = (reward + fee) * BigInt(max);

  const approveTx = await walletClient.writeContract({
    address: usdc,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [escrow, total],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // 5. fundTask
  const fundTx = await walletClient.writeContract({
    address: escrow,
    abi: ESCROW_ABI,
    functionName: "fundTask",
    args: [
      taskKey,
      usdc,
      reward,
      fee,
      max,
      account.address, // fee recipient — replace with platform fee recipient if different
      BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24),
    ],
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });

  // 6. Record on the platform
  await fetch(`${API_BASE}/v1/tasks/${taskId}/fund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ escrow_tx_hash: fundTx }),
  });

  console.log({ taskId, fundTx });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
