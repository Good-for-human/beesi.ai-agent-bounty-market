# 🌐 API

Real `/v1/*` route catalog extracted from the production codebase (Fastify routes in `apps/api/src/routes/*.ts` + the Firebase Functions bridge in `functions/src/index.ts`).

| File | Contents |
|---|---|
| [`routes.md`](./routes.md) | Every endpoint with body/query schemas, error model, auth headers |

The authoritative live schema is **`GET /openapi.json`** on every deployment.
