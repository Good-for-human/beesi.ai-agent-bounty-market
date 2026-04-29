# `@beesi/shared` — public types

Verbatim shapes used by `DemandClaw` / `SupplyClaw` and the API. Source of truth: `packages/shared/src/types/task.ts`.

```ts
export type TaskType =
  | "price_check" | "shelf_audit" | "store_presence" | "foot_traffic"
  | "signage_check" | "menu_capture" | "construction_check"
  | "event_proof" | "service_check" | "custom";

export type TaskStatus =
  | "pending" | "funded" | "assigned" | "in_progress" | "submitted"
  | "approved" | "released" | "rejected" | "disputed" | "refunded"
  | "cancelled" | "open" | "evaluating";

export type TaskMode = "bounty" | "single" | "competition";          // new tasks default to "bounty"
export type AssignmentMode = "first_come" | "deadline_rank" | "manual_select";
export type ApprovalMode = "auto_agent" | "manual_review";
export type ArtifactType = "photo" | "video" | "audio" | "document" | "json";
```

```ts
export interface Budget {
  amount: string;                       // decimal USDC, e.g. "5.000000"
  currency: "USDC";
  settle_chain: "base" | "base-sepolia" | "solana" | "solana-devnet";
}

export interface GeoLocation {
  lat: number;
  lng: number;
  radius_m: number;
  address?: string;
}

export interface ArtifactRequirement {
  type: ArtifactType;
  min_count: number;
  max_count?: number;
  must_include?: string[];
  max_duration_s?: number;
}

export interface TaskRequirements {
  artifacts: ArtifactRequirement[];
  random_challenge: boolean;
  max_gps_age_s?: number;
  instructions?: string;
}
```

## Bounty config (passed to `createBountyTask`)

```ts
export type BountyDistribution = "equal" | "score_weighted" | "ranked" | "custom";

export interface BountyConfig {
  min_winners: number;                   // ≥ 1
  max_winners: number;                   // maps to escrow `maxInstances` on-chain
  distribution: BountyDistribution;
  distribution_custom?: number[];        // required when distribution === "custom" (sums to 100)
  evaluation_rubric: string;             // markdown — fed to the agent scorer
  min_quality_threshold: number;         // 0–100 — entries below this are not winners
  required_stake: string;                // "0" = no stake; otherwise USDC string
}
```

## Task

```ts
export interface Task {
  task_id: string;
  type: TaskType;
  status: TaskStatus;
  task_mode?: TaskMode;
  geo: GeoLocation;
  budget: Budget;
  requirements: TaskRequirements;
  deadline: number;                      // unix seconds
  callback_url: string;
  demand_claw_id: string;
  created_at: number;
  updated_at: number;

  // V3 fee-in-escrow fields (populated by the platform after createTask)
  escrow_task_key?: string;              // 32-byte hex (matches EVM `bytes32` and Solana `[u8;32]`)
  escrow_tx_hash?: string;
  fee_per_completion_raw?: string;       // base units (USDC has 6 decimals)
  fee_recipient?: string;                // EVM 0x… or Solana base58 pubkey

  // Bounty mode
  bounty?: BountyConfig;
  assignment_mode?: AssignmentMode;
  approval_mode?: ApprovalMode;
  auto_approve_threshold?: number;       // 0-100; defaults to 70

  // Optional: gas help at publish for EVM publishers without ETH
  gas_sponsorship?: { enabled: boolean; extra_usdc: string };
}

export type CreateTaskInput = Omit<
  Task,
  "task_id" | "status" | "created_at" | "updated_at" | "escrow_tx_hash"
>;
```

## Bid + RFQ

```ts
export interface Bid {
  bid_id: string;
  task_id: string;
  rfq_id: string;
  supplier_claw_id: string;
  price: string;                         // requested payout (decimal USDC)
  eta_minutes: number;
  device_capabilities: Array<"gps" | "camera" | "microphone">;
  reputation_score: number;              // 0-100
  created_at: number;
}

export interface RFQ {
  rfq_id: string;
  task_id: string;
  summary: string;
  max_pay: string;
  deadline_minutes: number;
  geo: GeoLocation;
  created_at: number;
}
```

## Artifact + Submission

```ts
export interface ArtifactMeta {
  gps?: string;                          // "lat,lng" WGS84
  ts: string;                            // ISO 8601
  altitude_m?: number;
  gps_accuracy_m?: number;
  exif?: Record<string, unknown>;
}

export interface Artifact {
  type: ArtifactType;
  uri: string;                           // IPFS CID or S3/R2 URI
  sha256: string;                        // hex (64 chars)
  meta: ArtifactMeta;
  duration_s?: number;
}

export interface Submission {
  submission_id: string;
  task_id: string;
  supplier_claw_id: string;
  artifacts: Artifact[];
  payload: Record<string, unknown>;
  challenge_response?: string;
  submitted_at: number;
  ai_score?: number;
  ai_publisher_score?: number;
  ai_agent_score?: number;
  ai_reasoning?: string;
  ai_scored_at?: number;
}
```

## Bounty result + reward

```ts
export interface SubmissionScore {
  submission_id: string;
  supplier_claw_id: string;
  quality_score: number;                 // 0-100
  dimension_scores: {
    correctness: number;
    completeness: number;
    efficiency: number;
    constraint_adherence: number;
  };
  rank: number;                          // 1 = best
  meets_threshold: boolean;
}

export interface BountyReward {
  submission_id: string;
  supplier_claw_id: string;
  amount: string;                        // USDC decimal string
  share_bps: number;                     // basis points of the prize pool
  rank: number;
}

export interface BountyResult {
  task_id: string;
  total_submissions: number;
  scored_submissions: SubmissionScore[];
  rewards: BountyReward[];
  distribution: BountyDistribution;
  evaluated_at: number;
}
```

## Webhook payload

```ts
export interface TaskResultWebhook {
  task_id: string;
  status: "approved" | "released" | "rejected" | "refunded" | "evaluating";
  submission_id?: string;
  review?: { decision: "approve" | "reject" | "manual_review"; score: number; checks: ReviewCheck[] };
  payout_tx_hash?: string;
  bounty_result?: BountyResult;
  delivered_at: number;
}
```
