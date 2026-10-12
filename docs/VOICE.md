# Voice

What makes AI Aden sound like a person, and like Aden, in order of impact.

## 1. The source: your own clone (biggest lever)

A premade voice ("Will") reading your words will never sound like you. Realism comes mostly from the recording the clone learns from. Do both of these:

**Today, 10 minutes: Instant Voice Clone (IVC).** ElevenLabs → Voices → Add a new voice → Instant Voice Clone. Upload 1 to 3 minutes of yourself talking naturally (a Loom walkthrough audio track is fine). Copy the voice ID into `.env` as `ELEVENLABS_VOICE_ID`, restart, and listen. This tells you quickly whether the direction is right.

**This week: Professional Voice Clone (PVC).** ElevenLabs → Voices → Add a new voice → Professional Voice Clone. It needs at least 30 minutes of clean audio (1 to 3 hours is noticeably better), a short verification read to prove it's your voice, and a few hours of training. The PVC is what removes the robotic edge.

## 2. Record it as a conversation, not a reading

The avatar talks conversationally, so train it on you talking conversationally. A reading voice teaches the clone to sound like you reading.

- Room: a closet full of clothes or a small carpeted room beats an echoey office. No fan, no music, phone on silent.
- Mic: a USB mic or a good headset, a hand's width from your mouth, same position the whole session. Phone voice memos work in a pinch if held at the same distance.
- Energy: the way you'd explain your work on a call. Vary it: some excited, some thinking out loud, a laugh if it happens. That variety is what the clone learns as "you".
- Format: WAV or high-bitrate MP3, one speaker, no edits beyond cutting long silences and mistakes.

### The session doubles as knowledge capture

Answer the questions below out loud, 1 to 3 minutes each. That's the PVC audio and, transcribed, it becomes notes AI Aden can answer from (transcribe with ElevenLabs once the key has Speech to Text, save as a corpus-format markdown file in `private/inbox/`, then `npm run ingest -- corpus private/inbox/interview.md` and `npm run ingest -- review`).

1. Walk me through your career from your first engineering job to now.
2. What did you actually build at Vivint? What was hard about it?
3. Same for Agterra, and for NICE.
4. Tell the story of the Real Benefit Solutions rewrite.
5. What is GridSeak, and why did you build it?
6. Explain graph engineering to a senior engineer who's skeptical.
7. How do you use Claude Code and agents day to day? Walk through your loop.
8. How do you check what an agent did before you trust it?
9. What's the hardest bug you've chased, and how did you find it?
10. Why GridSchool? What did you see in hiring that made you start it?
11. What does a student's first week look like?
12. What are you weakest at, honestly?
13. A mistake you made building GridSchool and what it taught you.
14. What kind of team do you want to join, and what would you be bad at?
15. What happens to junior engineers in the next three years?
16. How do you decide what to build first?
17. Something you changed your mind about in the last year.
18. What you do when you're not working (only what you're happy to share publicly).

## 3. The model (done)

`ELEVENLABS_MODEL_ID` defaults to `eleven_v4_turbo`, ElevenLabs' most expressive real-time model. On our streaming endpoint it measured 0.21 s to first audio (Flash v2.5: 0.29 s) and returns character timings on nearly every chunk, which the lip sync needs. `eleven_v4` is the higher-quality non-turbo model at 0.52 s to first audio. Once your clone is trained, check in ElevenLabs which models it supports.

## 4. Words written for the ear (done)

The prompt asks for spoken language: contractions, mixed sentence lengths, a natural opener now and then. A formal note read aloud is the most robotic thing a voice can do, whatever the model.

## 5. Audio tags (listen first)

v4 Turbo accepts inline tags like `[chuckles]`, `[thoughtful]`, `[warmly]`. A/B samples 5 and 6 use them. If they sound natural and the tags aren't read aloud, enable them in the prompt (one or two per answer) and strip them from the on-screen summary. If they sound performed, leave them off.

## 6. Delivery settings (tune by ear, after the clone exists)

`voice_settings` in `src/voice/ttsStream.ts`: stability 0.45 (lower varies more between takes and sounds less flat; too low wobbles), similarity_boost 0.75 (higher hugs your recording; too high copies its noise). They behave differently per voice, so tune them on your clone, not on Will.

## Is ElevenLabs the right product?

For this site, yes, for now: the most mature self-cloning (IVC in minutes, PVC for fidelity), real-time expressive models with character timing for lip sync, and it's already integrated and measured. Two alternatives are worth a blind listening test once your PVC exists:

- **Hume Octave 2** leads blind votes on emotional expressiveness and clones from a short sample; check API access and preview status first.
- **Cartesia Sonic** leads on latency (40 to 90 ms); the question is the realism gap.

Swapping providers means one new implementation of `streamSentence` in `src/voice/ttsStream.ts`. The sentence pipeline, player, and lip sync stay.

## Cost

v4 Turbo bills about a full credit per character (Flash half). A typical spoken answer is $0.03 to $0.04 at Creator-plan rates, more than the model. It counts against `DAILY_BUDGET_USD` with everything else.
