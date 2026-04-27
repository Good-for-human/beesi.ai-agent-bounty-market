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
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
// import idl from "../../interfaces/solana/beesi_escrow.idl.json" with { type: "json" };

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const RPC_URL = process.env.SOL_RPC_URL ?? "https://api.devnet.solana.com";
const KEYPAIR_JSON = process.env.SOL_KEYPAIR_JSON ?? "[]";

const TASK_SEED = Buffer.from("task");
const VAULT_SEED = Buffer.from("vault");
const CONFIG_SEED = Buffer.from("config");

function taskKeyFrom(taskId: string): Uint8Array {
  // Illustrative: many deployments derive a 32-byte key from the task_id string.
  // Confirm with your API how task_key is derived for Solana (often: sha256 / keccak256 truncated to 32 bytes).
  const enc = new TextEncoder().encode(taskId);
  const out = new Uint8Array(32);
  out.set(enc.subarray(0, Math.min(32, enc.length)));
  return out;
}

async function main() {
  // 1. Create task
  const created = await fetch(`${API_BASE}/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Onchain capture (Solana)",
      task_mode: "bounty",
      reward_per_completion: "1000000",
      fee_per_completion: "100000",
      max_instances: 3,
      auto_approve_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    }),
  }).then((r) => r.json());
  const taskId: string = created.task_id;

  // 2. Resolve program + USDC mint
  const cfg = await fetch(
    `${API_BASE}/v1/escrow/config?network=solana-devnet`
  ).then((r) => r.json());
  const programId = new PublicKey(cfg.program_id);
  const usdcMint = new PublicKey(cfg.token_mint);

  // 3. Provider / program
  const connection = new Connection(RPC_URL, "confirmed");
  const secret = Uint8Array.from(JSON.parse(KEYPAIR_JSON));
  const publisher = Keypair.fromSecretKey(secret);
  const wallet = new Wallet(publisher);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  // const program = new Program(idl as any, programId, provider);

  // 4. Derive PDAs
  const taskKey = taskKeyFrom(taskId);
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);
  const [taskPda] = PublicKey.findProgramAddressSync([TASK_SEED, taskKey], programId);
  const [vaultPda] = PublicKey.findProgramAddressSync([VAULT_SEED, taskKey], programId);

  const publisherToken = await getAssociatedTokenAddress(usdcMint, publisher.publicKey);
  const feeRecipient = publisher.publicKey; // replace with platform fee recipient

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

  // 6. Record tx on the platform
  // await fetch(`${API_BASE}/v1/tasks/${taskId}/fund`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ escrow_tx_hash: sig }),
  // });

  console.log({ taskId, configPda: configPda.toBase58(), taskPda: taskPda.toBase58(), vaultPda: vaultPda.toBase58() });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
