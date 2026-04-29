/**
 * fund-task-solana.ts
 *
 * Path A funding on Solana devnet via the beesi_escrow Anchor program.
 *
 * NOTE: This file shows the *shape* of the call. To make it executable in your
 * environment, drop the IDL JSON from interfaces/solana/beesi_escrow.idl.json
 * next to this file and import it as `idl`.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
// import idl from "../../interfaces/solana/beesi_escrow.idl.json" with { type: "json" };

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const RPC_URL = process.env.SOL_RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR_JSON = process.env.SOL_KEYPAIR_JSON ?? "[]";
const PROJECT_KEY = process.env.PROJECT_KEY ?? "bprj_DEMO";

function authHeaders(walletAddress: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-beesi-api-key": PROJECT_KEY,
    "x-beesi-wallet-address": walletAddress,
  };
}

const TASK_SEED = Buffer.from("task");
const VAULT_SEED = Buffer.from("vault");
const CONFIG_SEED = Buffer.from("config");

async function taskKeyFrom(
  taskId: string,
  apiBase: string,
  walletAddress: string
): Promise<Uint8Array> {
  // Fetch the canonical escrow_task_key from the platform API.
  // DO NOT derive the key locally — the derivation algorithm is an internal
  // detail that may change between versions. Always read it from the Task.
  const task = (await fetch(`${apiBase}/v1/tasks/${taskId}`, {
    headers: authHeaders(walletAddress),
  }).then((r) => r.json())) as { escrow_task_key?: string };
  const hex = task.escrow_task_key;
  if (!hex) throw new Error(`escrow_task_key missing on task ${taskId}`);
  return Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
}

async function main() {
  const secret = Uint8Array.from(JSON.parse(KEYPAIR_JSON) as number[]);
  const publisher = Keypair.fromSecretKey(secret);

  // ── 1. Create task — body matches createTaskSchema in production ─────────
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const createBody = {
    type: "shelf_audit",
    task_mode: "bounty",
    geo: { lat: 52.5163, lng: 13.3777, radius_m: 500 },
    budget: {
      amount: "3.300000",
      currency: "USDC",
      settle_chain: "solana-devnet",
    },
    requirements: {
      artifacts: [{ type: "photo", min_count: 1 }],
      random_challenge: false,
      instructions: "Photograph the snack-aisle planogram",
    },
    deadline,
    callback_url: "https://your-server.example/beesi-webhook",
    demand_claw_id: publisher.publicKey.toBase58(),
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
    headers: authHeaders(publisher.publicKey.toBase58()),
    body: JSON.stringify(createBody),
  }).then((r) => r.json())) as { task_id: string };
  const taskId = created.task_id;

  // ── 2. Resolve program + USDC mint ───────────────────────────────────────
  const cfg = (await fetch(
    `${API_BASE}/v1/escrow/config?network=solana-devnet`
  ).then((r) => r.json())) as { escrow_address: string; token_address: string };
  const programId = new PublicKey(cfg.escrow_address);
  const usdcMint = new PublicKey(cfg.token_address);

  // ── 3. Provider / program ────────────────────────────────────────────────
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(publisher);
  const _provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  // const program = new Program(idl as Idl, programId, _provider);

  // ── 4. Derive PDAs ───────────────────────────────────────────────────────
  const taskKey = await taskKeyFrom(taskId, API_BASE, publisher.publicKey.toBase58());
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
  const [taskPda] = PublicKey.findProgramAddressSync([TASK_SEED, taskKey], programId);
  const [vaultPda] = PublicKey.findProgramAddressSync([VAULT_SEED, taskKey], programId);

  const _publisherToken = await getAssociatedTokenAddress(usdcMint, publisher.publicKey);
  const _feeRecipient = publisher.publicKey;

  // 5. fundTask (sketch — uncomment after wiring the IDL)
  /*
  const reward = 1_000_000n;       // 1 USDC
  const fee = 100_000n;            // 0.1 USDC
  const max = 3;
  const autoApproveAt = BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24);

  const sig = await program.methods
    .fundTask(Array.from(taskKey), reward, fee, max, feeRecipient, autoApproveAt)
    .accounts({
      config: configPda,
      task: taskPda,
      vault: vaultPda,
      publisher: publisher.publicKey,
      publisherToken,
      tokenMint: usdcMint,
      tokenProgram: SPL_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([publisher])
    .rpc();
  */

  // ── 6. Record tx on the platform (Path A) ────────────────────────────────
  // await fetch(`${API_BASE}/v1/tasks/${taskId}/fund`, {
  //   method: "POST",
  //   headers: authHeaders(publisher.publicKey.toBase58()),
  //   body: JSON.stringify({ escrow_tx_hash: sig }),
  // });

  console.log({ taskId, configPda: configPda.toBase58(), taskPda: taskPda.toBase58(), vaultPda: vaultPda.toBase58() });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
