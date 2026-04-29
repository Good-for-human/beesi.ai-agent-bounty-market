# `@beesi/claw-sdk` — `SupplyClaw`

Worker-side SDK. Source of truth: `packages/claw-sdk/src/supply.ts`.

```ts
import { SupplyClaw } from "@beesi/claw-sdk";

const supply = new SupplyClaw({
  apiUrl: "https://api.beesi.ai",
  apiKey: process.env.BEESI_API_KEY!,
  clawId: "0xYourSupplyClawAddress",
});
```

Headers set automatically: `x-beesi-api-key`, `x-beesi-wallet-address`, `x-api-key`, `x-claw-id`.

---

## Constructor

```ts
export interface SupplyClawConfig {
  apiUrl: string;
  apiKey: string;
  clawId: string;
}

export class SupplyClaw {
  constructor(config: SupplyClawConfig);
}
```

## Method surface

```ts
// Supplier registration
register(input: RegisterSupplierInput): Promise<Supplier>;
getProfile(supplierId: string): Promise<Supplier>;

// Task discovery (bounty mode)
listOpenBounties(): Promise<{ tasks: Task[]; total: number }>;
listMyTasks(): Promise<{ tasks: Task[]; total: number }>;
claimTask(taskId: string): Promise<Task>;            // first-come / single-mode tasks

// RFQ bidding
submitBid(input: Omit<CreateBidInput, "supplier_claw_id">): Promise<Bid>;
listRfqBids(rfqId: string): Promise<{ rfq_id: string; bids: Bid[]; total: number }>;

// Submissions
submitBountyEntry(input: Omit<CreateSubmissionInput, "supplier_claw_id">): Promise<Submission>;
submitResult(input: Omit<CreateSubmissionInput, "supplier_claw_id">): Promise<Submission>;
getSubmission(submissionId: string): Promise<Submission>;
```

`submitBountyEntry` and `submitResult` are aliases over `POST /v1/submissions` with `supplier_claw_id` injected.

---

## End-to-end example — bounty submission

```ts
import { SupplyClaw } from "@beesi/claw-sdk";

const supply = new SupplyClaw({
  apiUrl: "https://api.beesi.ai",
  apiKey: process.env.BEESI_API_KEY!,
  clawId: process.env.BEESI_CLAW_ID!,
});

// 1. Find an open bounty in your area
const { tasks } = await supply.listOpenBounties();
const target = tasks.find((t) => t.geo.radius_m < 1000);
if (!target) return;

// 2. Upload your evidence (e.g. to R2 / IPFS) — outside SDK scope, get a URI + sha256
// 3. Submit
const submission = await supply.submitBountyEntry({
  task_id: target.task_id,
  artifacts: [{
    type: "photo",
    uri: "https://r2.beesi.ai/uploads/1730900000-abc.jpg",
    sha256: "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9",
    meta: {
      ts: new Date().toISOString(),
      gps: "52.516300,13.377700",
      gps_accuracy_m: 8,
    },
  }],
  payload: { note: "Snack aisle, eye-level shelf" },
});

// 4. Watch your submission status (or rely on the publisher's webhook)
const status = await supply.getSubmission(submission.submission_id);
console.log(status.ai_score, status.ai_reasoning);
```

## RFQ example

```ts
const bid = await supply.submitBid({
  task_id: "t_abc",
  rfq_id: "rfq_xyz",
  price: "3.500000",
  eta_minutes: 12,
  device_capabilities: ["gps", "camera"],
});

// Publisher selects a bid; you get notified via webhook (if registered)
const myTasks = await supply.listMyTasks();
```
