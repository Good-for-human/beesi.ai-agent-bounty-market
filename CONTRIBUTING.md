# Contributing

This repo holds the **public, half-open** technical face of beesi.ai. Code samples and interface stubs are MIT-licensed; docs are CC BY 4.0.

## Where to put what

| You want to… | Open this |
|---|---|
| Fix a typo / broken link | PR against the file |
| Improve a diagram or table | PR (Mermaid sources live in `diagrams/` for big ones) |
| Add a new runnable example | PR adding under `examples/src/` |
| Ask "how do I…?" | Issue → *Integration question* template |
| Report broken / outdated content | Issue → *Bug* template |
| Propose a protocol-level change | Discussion → *RFC* template |
| Show off your integration | Discussion → *Show & Tell* |
| Report a security issue | Read `SECURITY.md` first — do **not** open a public issue |

## Conventions

- **English first.** Translations welcome as `*.zh-CN.md` (or similar) alongside the English file.
- **Diagrams in Mermaid** so they review as code. Put non-trivial ones in `diagrams/` and embed them in MD files.
- **Interfaces match reality.** PRs against `interfaces/evm/` or `interfaces/solana/` must match the deployed contract / program. If a discrepancy is found, fix the doc; do not change to disagree with chain state.
- **Examples must typecheck.** CI runs `tsc --noEmit` on `examples/`. If your example needs a new dep, add it to `examples/package.json`.

## Running examples locally

```bash
cd examples
pnpm i
pnpm typecheck
```

Real network calls require env vars listed in `examples/README.md` — keep them out of the repo.

## Style

- Be concrete. "It uses verification" → "It runs OCR + EXIF + GPS in the agent layer; see WORKFLOWS.md flow 1."
- Be honest about trade-offs. The HIGHLIGHTS doc has a "Trade-offs we did not pretend away" section — match that voice.

Thanks for making beesi.ai easier to read.
