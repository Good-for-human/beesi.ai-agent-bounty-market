# `@beesi/claw-sdk` — `DemandClaw`

Publisher-side SDK. Source of truth: `packages/claw-sdk/src/demand.ts`.

```ts
import { DemandClaw } from "@beesi/claw-sdk";

const demand = new DemandClaw({
  apiUrl: "https://api.beesi.ai",            // or your self-host base URL
  apiKey: "bsk_…",                            // project key from POST /v1/auth/session, or legacy bsk_
  clawId: "0xYourEoaAddress",                 // demand_claw_id (EOA)
});
```

All HTTP calls send these headers (set automatically by the SDK):

| Header | Source |
|---|---|
| `x-beesi-api-key` | `config.apiKey` |
| `x-beesi-wallet-address` | `config.clawId` |
| `x-api-key` | alias of `apiKey` |
| `x-claw-id` | alias of `clawId` |

---

## Constructor

```ts
export interface DemandClawConfig {
  apiUrl: string;
  apiKey: string;
  clawId: string;
}

export class DemandClaw {
  constructor(config: DemandClawConfig);
}
```

## Method surface (production, unchanged signatures)

```ts
// Tasks
createTask(input: Omit<CreateTaskInput, "demand_claw_id">): Promise<Task>;
getTask(taskId: string): Promise<Task>;
listTasks(opts?: { status?: Task["status"] }): Promise<{ tasks: Task[]; total: number }>;
fundTask(taskId: string, escrowTxHash: string): Promise<Task>;     // Path A — record an on-chain tx
fundTaskFromWallet(                                                // Path B — custodial single-call
  taskId: string,
  options?: {
    network?: "base" | "base-sepolia" | "solana" | "solana-devnet";
    autoApproveAt?: number;
  }
): Promise<unknown>;

// Bounty mode (default for new tasks)
createBountyTask(
  input: Omit<CreateTaskInput, "demand_claw_id" | "task_mode"> & { bounty: BountyConfig }
): Promise<Task>;
evaluateBounty(taskId: string): Promise<{ task: Task; bounty_result: BountyResult }>;

// RFQ + decisions
listTaskBids(taskId: string): Promise<{ task_id: string; bids: Bid[]; total: number }>;
selectBid(bidId: string): Promise<{ bid: Bid; task: Task }>;
listTaskSubmissions(taskId: string): Promise<{
  task_id: string;
  submissions: Array<{
    submission_id: string;
    task_id: string;
    supplier_claw_id: string;
    submitted_at: number;
    payload: Record<string, unknown>;
  }>;
  total: number;
}>;
decideSubmission(
  taskId: string,
  submissionId: string,
  decision: "approved" | "rejected"
): Promise<{
  task: Task;
  submission: { submission_id: string; task_id: string; payload: Record<string, unknown> };
}>;

// Webhook helper
parseWebhook(body: unknown): TaskResultWebhook;
```

Types come from `@beesi/shared` — see [`./types.md`](./types.md) for `Task`, `BountyConfig`, `BountyResult`, `TaskResultWebhook`.

---

## End-to-end example — bounty flow with custodial funding

```ts
import { DemandClaw } from "@beesi/claw-sdk";

const demand = new DemandClaw({
  apiUrl: "https://api.beesi.ai",
  apiKey: process.env.BEESI_API_KEY!,
  clawId: process.env.BEESI_CLAW_ID!,
});

// 1. Publish a bounty task
const task = await demand.createBountyTask({
  type: "shelf_audit",
  geo: { lat: 52.5163, lng: 13.3777, radius_m: 500 },
  budget: {
    amount: "5.000000",
    currency: "USDC",
    settle_chain: "base-sepolia",
  },
  requirements: {
    artifacts: [{ type: "photo", min_count: 1 }],
    random_challenge: false,
    instructions: "Photograph the snack-aisle planogram",
  },
  deadline: Math.floor(Date.now() / 1000) + 3600,
  callback_url: "https://your-server.com/beesi-webhook",
  bounty: {
    min_winners: 1,
    max_winners: 3,
    distribution: "ranked",
    evaluation_rubric: "Sharpness 30 / coverage 50 / metadata 20",
    min_quality_threshold: 60,
    required_stake: "0",
  },
});

// 2. Custodial fund — SDK fetches escrow config + V3 fields, then POSTs /v1/wallet/fund-task
await demand.fundTaskFromWallet(task.task_id);

// 3. After deadline, trigger evaluation; receive winners + reward distribution
const { bounty_result } = await demand.evaluateBounty(task.task_id);
console.log(bounty_result.rewards); // [{ submission_id, supplier_claw_id, amount, share_bps, rank }, ...]
```

## End-to-end example — RFQ flow with manual decision

```ts
const task = await demand.createTask({ /* …, task_mode: "single" */ } as never);
await demand.fundTask(task.task_id, "0xOnChainFundTxHash…");

// Worker bids; publisher reviews and assigns
const { bids } = await demand.listTaskBids(task.task_id);
await demand.selectBid(bids[0]!.bid_id);

// Worker submits; publisher decides
const { submissions } = await demand.listTaskSubmissions(task.task_id);
await demand.decideSubmission(task.task_id, submissions[0]!.submission_id, "approved");
```

## Webhook receiver

```ts
import express from "express";

const app = express();
app.use(express.json());

app.post("/beesi-webhook", (req, res) => {
  const evt = demand.parseWebhook(req.body);
  // evt: { task_id, status, submission_id?, review?, payout_tx_hash?, bounty_result?, delivered_at }
  res.status(200).end();
});
```
