# EVM interface

`IBeesiEscrow.sol` — the integration interface for the **`BeesiEscrow` V3** contract on **Base**.

## Use cases

- **Indexers** — listen to the events declared here; ABI is derived from this file.
- **Wallet integrations** — generate calldata for `fundTask` and `approveSubmission`.
- **Type generators** — `wagmi`, `typechain`, `abi-to-rust`, etc. all consume this file directly.

## Generate ABI

```bash
forge inspect --legacy IBeesiEscrow abi
# or
solc --abi IBeesiEscrow.sol
```

## Address resolution at runtime

```bash
curl https://<your-api>/v1/escrow/config?network=base-sepolia
```

Returns `{ chain: "base-sepolia", escrow_address: "0x...", token_address: "0x...USDC" }`.

## Auditor pointers

- The implementation lives in the engineering monorepo at `apps/web/contracts/BeesiEscrow.sol`.
- Foundry test suite: `pnpm --filter @beesi/web run test:escrow:forge`.
- The interface here is **complete**: any function or event in the implementation that you can call externally is in this file. No hidden admin paths.
