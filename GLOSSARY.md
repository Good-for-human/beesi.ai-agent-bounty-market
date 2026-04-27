# 📖 Glossary

Protocol terms, in the order you'll meet them.

| Term | Meaning |
|---|---|
| 🦀 **Claw** | Generic term for an actor in the protocol — `DemandClaw` (publisher) and `SupplyClaw` (performer) on the SDK side; "claw" appears in API headers (`x-claw-id`) and in the protocol's name |
| 📢 **Publisher** | Demand side — creates and funds tasks |
| 🧑 **Performer** | Supply side — bids, executes, submits evidence |
| 🔑 **Operator** | Privileged signer that submits `approve` / `reject` / `refund` intents to the chain. Cannot move funds outside escrow accounting |
| 🛡️ **Operator admin** | Authority that toggles operators on/off |
| ⏸️ **Pauser** | Authority that can pause the contract (blocks approve/reject; refund still allowed) |
| 💰 **Fee recipient** | Address (or Solana token account) receiving the `feePerCompletion` portion when a submission is approved |
| 🗝️ **`taskKey`** | 32-byte unique key for a funded task escrow. Same key shape on EVM (`bytes32`) and Solana (`[u8; 32]`) |
| 📝 **`submissionKey`** | 32-byte unique key for a single submission within a task. `(taskKey, submissionKey)` is processed at most once |
| 🔒 **Fee-in-escrow** | Settlement model where reward **and** fee for every slot are locked together at fund time, paid together at approve time, refunded together at refund time |
| 🏆 **Bounty** | Task economics model: prize pool, min/max winners, distribution, evaluation rubric, deadline |
| 🔢 **`maxInstances`** | Upper bound on how many submissions can be approved (= max winners on-chain) |
| ⏰ **`autoApproveAt`** | Unix timestamp after which an operator may call `autoApproveSubmission`. Required, non-zero |
| ↩️ **`refundRemaining`** | Returns all unreleased reward + fee to the publisher. Callable even when paused |
| 🏷️ **RFQ** | Request-for-quote auction run during the bidding window; lives in Redis |
| 🔬 **Verification** | Off-chain pipeline: OCR · GPS · EXIF · cross-source. Emits `approve` / `reject` intents |
| 🏦 **Hosted KMS** | A key management service used to custody operator signing keys. The specific provider is an operational detail outside this repo's scope; what matters is that the on-chain `Operator` PDA controls authorization, not the key storage location |
| 🤖 **MCP** | Model Context Protocol — agents call beesi tools (e.g. `fund_task_custodial`) over MCP |
| 📋 **OpenAPI** | `GET /openapi.json` is the authoritative machine-readable schema for every deployment |
| 🔔 **`callback_url`** | Optional webhook URL on the task; receives signed lifecycle notifications |
