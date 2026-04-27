# Roadmap

Public, non-binding, focused on what the community can verify on-chain or in this repo.

---

## Live now

| Surface | Where |
|---|---|
| `BeesiEscrow.sol` V3 (fee-in-escrow) | **Base Sepolia** |
| `beesi_escrow` Anchor V2 (mirrored fee-in-escrow) | **Solana devnet** |
| Public OpenAPI | every deploy at `/openapi.json` |
| Custodial funding (`fund_task_custodial` MCP tool) | hosted API |
| Auto-approve scheduler | hosted API |

---

## In flight

- **External audit (both chains, in parallel).** Mainnet is gated on this. We will not ship one chain to mainnet without the other.
- **Public reputation graph.** Today reputation is internal; we want it queryable per-claw under stable identifiers.
- **Verification module catalog.** Document the verification interface so vendor-pluggable modules can be evaluated without forking the agent layer.

---

## Audit-gated mainnet release

Specifically blocked on:

1. EVM contract audit pass on `BeesiEscrow.sol` V3 — *no production funds on Base mainnet until then.*
2. Solana program audit pass on `beesi_escrow` V2 — *no production funds on Solana mainnet until then.*
3. Coordinated dual-chain ship — both chains flip together, not staggered.

We make this commitment publicly so we can be held to it.

---

## Things we deliberately do not promise

- **A bridge.** Symmetric programs ≠ a bridge. We do not move funds between Base and Solana; each task lives entirely on one chain.
- **Permissionless verification.** Verification stays operator-mediated. The scope to make verification trust-minimized is bounded by the cost of reproducing the OCR/EXIF/geo stack on-chain — currently impractical.
- **Token-incentivized supply.** No token. USDC is the unit of account.

---

## Track changes

See [`CHANGELOG.md`](./CHANGELOG.md) for what shipped to **this docs repo**. Engineering monorepo changes are tracked there.
