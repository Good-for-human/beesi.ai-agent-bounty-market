/**
 * bid-and-submit.ts
 *
 * Worker (supply-side) reference flow against production routes:
 *
 *   1. GET  /v1/tasks?status=funded         — list funded RFQ tasks
 *   2. GET  /v1/tasks/:taskId/rfqs          — pick an open RFQ
 *   3. POST /v1/bids                        — submit an RFQ bid
 *   4. (Wait for selection — publisher PATCHes /v1/bids/:bidId/select)
 *   5. POST /v1/submissions                 — submit evidence with sha256 + GPS
 *
 * For the bounty flow (no RFQ, no bid) skip steps 2–4 and:
 *   1. GET /v1/tasks?status=open
 *   2. POST /v1/submissions
 *
 * Body shapes mirror the Zod schemas in apps/api/src/routes/{bids,submissions}.ts.
 */

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const PROJECT_KEY = process.env.PROJECT_KEY ?? "bprj_DEMO";
const CLAW_ID = process.env.CLAW_ID ?? "0xYourSupplierEoa";

interface Task {
  task_id: string;
  status: string;
  task_mode?: "bounty" | "single" | "competition";
}

interface RFQ {
  rfq_id: string;
  task_id: string;
  max_pay: string;
  deadline_minutes: number;
}

interface Bid {
  bid_id: string;
  task_id: string;
  rfq_id: string;
}

interface Submission {
  submission_id: string;
  task_id: string;
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-beesi-api-key": PROJECT_KEY,
    "x-beesi-wallet-address": CLAW_ID,
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${res.status} ${res.statusText} ${JSON.stringify(body)}`);
  }
  return (await res.json()) as T;
}

async function main() {
  // ── 1. Find a funded RFQ task ────────────────────────────────────────────
  const { tasks } = await api<{ tasks: Task[] }>(`/v1/tasks?status=funded`);
  const task = tasks.find((t) => t.task_mode !== "bounty");
  if (!task) {
    console.log("No funded RFQ tasks; try a bounty task instead.");
    return;
  }

  // ── 2. Read RFQs on the task ─────────────────────────────────────────────
  const { rfqs } = await api<{ rfqs: RFQ[] }>(`/v1/tasks/${task.task_id}/rfqs`);
  const rfq = rfqs[0];
  if (!rfq) {
    console.log(`Task ${task.task_id} has no open RFQs.`);
    return;
  }

  // ── 3. Submit a bid (real schema in routes/bids.ts) ──────────────────────
  const bid = await api<Bid>(`/v1/bids`, {
    method: "POST",
    body: JSON.stringify({
      task_id: task.task_id,
      rfq_id: rfq.rfq_id,
      supplier_claw_id: CLAW_ID,
      price: "0.950000",
      eta_minutes: 10,
      device_capabilities: ["gps", "camera"],
    }),
  });
  console.log("Posted bid:", bid.bid_id);

  // ── 4. Poll for selection ────────────────────────────────────────────────
  let assigned = false;
  for (let i = 0; i < 6; i += 1) {
    const t = await api<Task>(`/v1/tasks/${task.task_id}`);
    if (t.status === "assigned") {
      assigned = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!assigned) {
    console.log("Not selected this round.");
    return;
  }

  // ── 5. Submit evidence (real schema in routes/submissions.ts) ────────────
  const submission = await api<Submission>(`/v1/submissions`, {
    method: "POST",
    body: JSON.stringify({
      task_id: task.task_id,
      supplier_claw_id: CLAW_ID,
      artifacts: [
        {
          type: "photo",
          uri: "https://r2.your-bucket.example/uploads/abc.jpg",
          sha256: "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9",
          meta: {
            ts: new Date().toISOString(),
            gps: "52.516300,13.377700",
            gps_accuracy_m: 8,
          },
        },
      ],
      payload: { note: "Eye-level shot, snack aisle" },
    }),
  });
  console.log("Submitted:", submission.submission_id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
