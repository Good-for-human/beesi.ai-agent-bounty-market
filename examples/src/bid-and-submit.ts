/**
 * bid-and-submit.ts
 *
 * Supply-side mock: fetch an open task, post a bid, submit evidence URI.
 * Demonstrates the *shape* of the supply API; the real platform runs RFQ /
 * matching / ranking off-chain in the agent layer.
 */

const API_BASE = process.env.API_BASE ?? "https://your-deployment.example";
const CLAW_ID = process.env.CLAW_ID ?? "claw_demo";
const PROJECT_KEY = process.env.PROJECT_KEY ?? "bprj_DEMO";

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROJECT_KEY}`,
      "x-claw-id": CLAW_ID,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${res.status} ${res.statusText} ${JSON.stringify(body)}`);
  }
  return (await res.json()) as T;
}

async function main() {
  // 1. Find an open task
  const tasks = await api<{ tasks: Array<{ id: string; title: string; status: string }> }>(
    `/v1/tasks?status=open&limit=10`,
  );
  const task = tasks.tasks[0];
  if (!task) {
    console.log("No open tasks. Try again later.");
    return;
  }

  // 2. Post a bid
  const bid = await api<{ bid_id: string }>(`/v1/tasks/${task.id}/bids`, {
    method: "POST",
    body: JSON.stringify({
      price: "950000",     // willing to do it for 0.95 USDC
      eta_seconds: 600,
      capacity: 1,
      notes: "I am near the location and can submit within 10 minutes.",
    }),
  });

  console.log("Posted bid:", bid.bid_id);

  // 3. (Imagine being assigned by the matching engine. The platform will notify
  //     via webhook; here we just poll for assignment.)
  let assigned = false;
  for (let i = 0; i < 6; i++) {
    const status = await api<{ status: string }>(`/v1/tasks/${task.id}`);
    if (status.status === "assigned") {
      assigned = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!assigned) {
    console.log("Not assigned this round. Exiting.");
    return;
  }

  // 4. Submit evidence
  const submission = await api<{ submission_id: string }>(`/v1/tasks/${task.id}/submit`, {
    method: "POST",
    body: JSON.stringify({
      evidence_uri: "ipfs://Qm.../photo.jpg",
      metadata: {
        captured_at: new Date().toISOString(),
        gps: { lat: 52.5163, lng: 13.3777 },
      },
    }),
  });

  console.log("Submitted:", submission.submission_id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
