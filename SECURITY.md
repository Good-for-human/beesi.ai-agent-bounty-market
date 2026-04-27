# 🔐 Security policy

## ⚠️ Reporting a vulnerability

**Do not open a public GitHub issue.** Email or contact channel: *replace with your security contact before publishing*.

Include:

- Affected component (contract / program / API / SDK / docs).
- Reproduction steps with concrete values; concrete is better than abstract.
- Impact assessment, especially for fund-loss-class issues.
- Whether you need coordinated disclosure and a public ack.

We aim to acknowledge receipt within a few business days. Severity drives triage time.

## 🎯 Scope

| ✅ In scope | ❌ Out of scope |
|---|---|
| Authorization bypass on `BeesiEscrow` (EVM) or `beesi_escrow` (Solana) | Vulnerabilities in third-party wallets we don't control |
| Operator-mediated approval / refund logic flaws | Social engineering, phishing of individual users |
| API auth / token leakage in surfaces documented here | Issues in unmaintained forks |
| Fund-loss paths via `(taskKey, submissionKey)` collisions | Theoretical issues with no exploit path |
| Webhook signature bypass | DoS via raw RPC flooding (use upstream RPC providers' policies) |

## 🔍 Audit status

`BeesiEscrow.sol` V3 (Base) and `beesi_escrow` (Solana) are pending **external audit**. Mainnet on either chain is gated on audit completion — see [`ROADMAP.md`](./ROADMAP.md). We will publish the audit report when it is final.

## 🏅 Credit

Researchers who report responsibly get a public ack in `CHANGELOG.md` and, when applicable, in audit acknowledgements.
