# Cost

Ceilings are product decisions. Defaults (override with env):

- 5 live questions per visit (a fit check spends 2)
- 180 seconds of voice per visit
- $5 USD per UTC day for model and voice together

Past any of them, answers keep coming free from the notes. Each answer shows its own cost, and the meter on `/ask` shows today's spend against the ceiling.

## Per-answer cost

`src/guard/costTable.ts` prices tokens per model, including prompt-cache reads and writes. A typical answer sends a ~1.2k-token system prompt (cached after the first question in a five-minute window), ~1.5k tokens of retrieved notes and history, and gets ~250 tokens back.

| Model | Approx. per answer | Per five-question visit |
|---|---|---|
| `claude-haiku-5-5` (default) | ~$0.0005 (measured) | ~$0.003 |
| `claude-sonnet-5-5` | ~$0.01 | ~$0.05 |
| `claude-opus-5-5` | ~$0.01 to $0.02 | ~$0.05 to $0.10 |
| ElevenLabs voice, any model | ~$0.01 to $0.02 (measured) | ~$0.05 to $0.10 |
| Notes-only mode | $0 | $0 |

Those are estimates from token counts. Real numbers show up per answer in the page and in Analytics Engine once deployed. At the default ceiling a viral day costs at most $5, and then the site keeps working in notes-only mode.

`npm run evals -- --llm` runs 33 model calls: $0.0084 on Haiku (measured), about $0.50 on Opus.

Voice now costs more than the model. If the daily ceiling bites, shorter spoken answers are the first lever.

## Recurring floor

| Item | Monthly |
|---|---|
| Cloudflare Workers Paid (Vectorize needs it) | ~$5 |
| ElevenLabs Creator (professional voice clone), optional | ~$22 |
| Model usage | capped by `DAILY_BUDGET_USD` |
