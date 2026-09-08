# Cost

Ceilings are product, not ops trivia.

Defaults (override with env):

- 5 live questions per session
- 180 seconds of voice per session
- $5 USD per UTC day, then cached/text only

## Unit costs used by the guard

| Item | Estimate in `src/guard/costTable.ts` |
|---|---|
| Extractive / no LLM | $0.0004 per question |
| LLM (Luna-class default) | $0.20 / M input, $1.20 / M output |
| ElevenLabs Flash-class | $0.05 per 1,000 characters |

Telemetry writes `ask`, `tts`, `ask_blocked`, `ask_budget` to Analytics Engine when bound. This file is the human dashboard until that dataset is queried.

## Recurring floor

| Item | Monthly |
|---|---|
| Cloudflare Workers Paid (if Vectorize requires it) | ~$5 |
| ElevenLabs Creator (professional clone) | ~$22 |
| LLM | usage, cached prompt helps |
| Students skipping voice | $0 to $5 |

A viral spike at the default ceiling costs at most about $5 that day. Raise or lower `DAILY_BUDGET_USD`.
