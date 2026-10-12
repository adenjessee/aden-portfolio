# Knowledge: from your exports to a live answer

AI Aden can only say what is in `content/kb`. This is how more of you gets in safely, and how it stays fast to retrieve.

## The flow

```
private/inbox/          raw exports you drop in (gitignored, never committed)
  linkedin/             unzipped LinkedIn export
  chatgpt/              conversations.json from ChatGPT
  interview.md          transcribed voice session (docs/VOICE.md)
        |
        |  npm run ingest -- linkedin | chatgpt | corpus <files>
        v
private/extracted/      candidate facts as JSON: claim, target note, evidence quote, source, sensitivity
        |   scrubbed of emails, phones, addresses, secrets before any model sees text
        |   private and sensitive facts dropped (model rating + a fixed rule for pay, health, family, faith)
        |
        |  npm run ingest -- review
        v
private/review/facts.md one checkbox per fact, grouped by note, duplicates merged
        |   YOU tick what is true and fine to publish, and edit wording in place
        |
        |  npm run ingest -- promote
        v
content/kb/<note>.md    ticked facts land under "Reviewed facts", note marked draft
        |   (then, with Claude: fold the bullets into prose, mark verified)
        |
        |  npm run build (index-kb runs first)
        v
src/rag/generated/kb-index.json   chunks + BM25 index bundled into the Worker
Vectorize                         embeddings (npm run embed-kb after deploy)
```

Nothing reaches `content/kb` without your tick. The review file is the gate.

## Getting the exports

- **LinkedIn:** Settings → Data privacy → Get a copy of your data → choose the larger archive (it includes Positions, Education, Skills, Projects, Recommendations). It arrives by email within a day. Unzip into `private/inbox/linkedin/`. Connections and Messages are in the zip too; the intake never opens them.
- **ChatGPT:** Settings → Data controls → Export data. Unzip; put `conversations.json` in `private/inbox/chatgpt/`. Only your own messages are read, never the assistant's.
- **Claude conversations** (optional): claude.ai → Settings → Privacy → Export data. Same idea; tell Claude when you have it and it will add a reader.

Cost: about $0.06 per 800 messages on Haiku. A large ChatGPT history (10,000 messages) is under $1.

## How it is organized for fast, accurate retrieval

- **One topic per note.** Retrieval returns paragraphs (~700 characters); a note about one thing gives clean, citable paragraphs. "career/experience" holds jobs; "positions/hiring" holds opinions on hiring.
- **Paragraphs stand alone.** Each names its subject ("At Agterra I…") instead of leaning on the previous paragraph, because it may be retrieved alone.
- **Use the visitor's words.** If people ask "experience", "stack", "remote", "salary", those words should appear in the note that answers them. FAQ-style lines ("Are you open to work? …") are matched directly.
- **Status is honest.** verified (you confirmed), draft (written from sources), mock (placeholder). Mock facts are never stated; draft is fine to use.
- **Two retrievers, fused.** BM25 inside the Worker (no network call, about a millisecond) and Workers AI vectors, combined by rank. The bundled index is about 90 KB today; it stays fast into the low thousands of notes. Past roughly 5 MB, move the index to KV or R2 and keep BM25 in the Worker.
- **Evals guard it.** When you add knowledge, add the questions it should answer to `evals/cases.json`. `npm test` runs them without a model; `npm run evals -- --llm` runs them against Haiku for about a cent.

## Already run

The work-related half of your TRON prompt corpus: 786 of your messages, 344 candidate facts in `private/review/facts.md` (including Vivint, Agterra, NICE, the RBS rewrite), 57 dropped as private, $0.056. Review it first; it's the fastest way to replace the `[MOCK]` career notes.
