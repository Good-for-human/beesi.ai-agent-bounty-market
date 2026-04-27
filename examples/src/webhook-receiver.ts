/**
 * webhook-receiver.ts
 *
 * Fastify server that receives signed lifecycle webhooks from beesi.ai.
 * Verifies HMAC-SHA256 signatures using `WEBHOOK_HMAC_SECRET`.
 *
 * Lifecycle event types you should expect (subset):
 *   funded, assigned, submitted, approved, released, rejected, refunded
 */

import Fastify from "fastify";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT ?? 3030);
const SECRET = process.env.WEBHOOK_HMAC_SECRET;
if (!SECRET) {
  console.error("FATAL: WEBHOOK_HMAC_SECRET env var is not set. Refusing to start with no signature verification.");
  process.exit(1);
}

const app = Fastify({ logger: true });

app.post("/webhook", async (req, reply) => {
  const signature = String(req.headers["x-beesi-signature"] ?? "");
  const raw = JSON.stringify(req.body);

  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(raw)
    .digest("hex");

  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!ok) {
    reply.code(401).send({ error: "invalid signature" });
    return;
  }

  const evt = req.body as {
    type: string;
    task_id: string;
    submission_id?: string;
    chain?: string;
    tx_hash?: string;
  };

  switch (evt.type) {
    case "funded":
      app.log.info({ task: evt.task_id, tx: evt.tx_hash, chain: evt.chain }, "task funded");
      break;
    case "assigned":
      app.log.info({ task: evt.task_id }, "task assigned");
      break;
    case "submitted":
      app.log.info({ task: evt.task_id, submission: evt.submission_id }, "submission received");
      break;
    case "approved":
      app.log.info({ task: evt.task_id, submission: evt.submission_id, tx: evt.tx_hash }, "submission approved on-chain");
      break;
    case "rejected":
      app.log.info({ task: evt.task_id, submission: evt.submission_id }, "submission rejected");
      break;
    case "refunded":
      app.log.info({ task: evt.task_id, tx: evt.tx_hash }, "task refunded");
      break;
    default:
      app.log.warn({ evt }, "unknown event type");
  }

  reply.code(200).send({ ok: true });
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
