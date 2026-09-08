# Voice clone

Professional Voice Clone needs an ElevenLabs Creator plan and about 30 minutes of clean, single-speaker audio, plus the identity CAPTCHA read.

Record in a quiet room, one mic, no music, no compression. Talk the way you talk on a walkthrough: explanations, not slogans.

Set:

```
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
```

Then:

```bash
npm run render-demo-audio
```

`/api/tts` proxies the key. The browser never sees it. Alignment timestamps drive VRM visemes; amplitude is the fallback.
