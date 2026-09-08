# Accounts I cannot open for you

I can write the code and run it locally. I cannot create billed vendor accounts or click OAuth in your browser.

| Need | Why | What to do | What I do after |
|---|---|---|---|
| Cloudflare login + Workers Paid if Vectorize requires it | Live deploy, KV, rate limit, Vectorize | `npx wrangler login` in this repo, or set `CLOUDFLARE_API_TOKEN` | I create KV + Vectorize, fill `wrangler.jsonc`, deploy |
| OpenAI (or another chat API) key | Spoken-quality answers and scene direction | Put `OPENAI_API_KEY` and `LLM_MODEL` in `.env` | I verify structured output against the corpus |
| ElevenLabs Creator + Professional Voice Clone | Your voice, lip sync | Record 30+ min, train, put `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env` | I render the demo audio and turn TTS on |
| VRoid export | 3D Aden that looks like you | Export VRM 1.0 to `public/models/aden.vrm` | I check bones, visemes, file size |
| Confirm `src/config/site.ts` | LinkedIn, email, domain | Tell me the real values | I patch and commit |

GitHub is already connected. The repo is public: https://github.com/adenjessee/aden-portfolio
