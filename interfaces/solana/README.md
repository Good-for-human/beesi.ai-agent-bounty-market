# Solana interface

`beesi_escrow.idl.json` — Anchor IDL for the **`beesi_escrow`** program on **Solana**.

## Use cases

- Generate a typed client with `@coral-xyz/anchor`:

```ts
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "./beesi_escrow.idl.json";

const provider = AnchorProvider.env();
const program = new Program(idl as any, programId, provider);
await program.methods
  .fundTask(taskKey, rewardLamports, feeLamports, maxInstances, feeRecipient, autoApproveAt)
  .accounts({ /* ... */ })
  .rpc();
```

- Index events (`TaskFunded`, `SubmissionApproved`, `SubmissionRejected`, `TaskRefunded`) for the same data shape as the EVM events.

## PDA seeds (mirrored on the Rust side)

| Account | Seeds |
|---|---|
| `Config` | `[b"config"]` |
| `Operator` | `[b"operator", operator_pubkey]` |
| `TaskAccount` | `[b"task", task_key]` |
| `Vault` (TokenAccount) | `[b"vault", task_key]` |
| `Submission` | `[b"submission", task_key, submission_key]` |

## Address resolution at runtime

```bash
curl https://<your-api>/v1/escrow/config?network=solana-devnet
```

Returns `{ chain: "solana-devnet", program_id: "...", token_mint: "...USDC SPL" }`.

## Auditor pointers

- Reference implementation: `anchor/programs/beesi-escrow/src/lib.rs`.
- Test suite: `cd anchor && anchor test`.
- Operator signing in production goes through **CDP `signTransaction`**; the program does not care about the signing path, only that the signer is an enabled operator.
