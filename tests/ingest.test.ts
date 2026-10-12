import { describe, expect, it } from "vitest";
import type { LlmClient } from "../src/director/llm";
import { csvRecords, parseCsv } from "../src/ingest/csv";
import { extractFacts } from "../src/ingest/extract";
import { linkedinCandidates } from "../src/ingest/linkedin";
import { chatgptMessages, corpusMessages, toBatches } from "../src/ingest/messages";
import { scrub } from "../src/ingest/pii";
import { mergeIntoNote } from "../src/ingest/promote";
import { dedupe, parseReview, renderReview } from "../src/ingest/review";
import type { Candidate } from "../src/ingest/types";

const profile = `First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers
Aden,Jessee,,"123 Main Street, Boise",Jan 1 1990,Applied AI engineer,"I build graph tools.
Second line.",Software,83702,"Boise, Idaho",,,`;
const positions = `Company Name,Title,Description,Location,Started On,Finished On
GRID SCHOOL LLC,Founder,"Built the Hire engine, ""end to end"".","Boise, Idaho",Jan 2025,`;

describe("ingest", () => {
  it("parses quoted CSV with newlines and doubled quotes", () => {
    expect(parseCsv('a,b\n"x\ny","say ""hi"""\n')).toEqual([["a", "b"], ["x\ny", 'say "hi"']]);
    expect(csvRecords("Notes:\nignore me\nName\nTypeScript\n", "Name")).toEqual([{ name: "TypeScript" }]);
  });

  it("keeps profile facts and never the address, birth date or zip", () => {
    const out = linkedinCandidates({ "Profile.csv": profile, "Positions.csv": positions });
    const all = JSON.stringify(out);
    expect(all).not.toMatch(/Main Street|1990|83702/);
    expect(out.find((c) => c.target === "career/experience")?.claim).toBe(
      'I worked at GRID SCHOOL LLC as Founder, Jan 2025 to present, in Boise, Idaho. Built the Hire engine, "end to end".',
    );
    expect(out.some((c) => c.claim.includes("Boise, Idaho") && c.target === "me/location-and-availability")).toBe(true);
  });

  it("scrubs contact details and secrets", () => {
    expect(scrub("mail me at a.b@x.io or 208-555-0142, key sk-ant-abcdefghijklmnop")).toBe("mail me at [email] or [phone], key [secret]");
  });

  it("reads only the user's side of a ChatGPT export, and the corpus format", () => {
    const exportJson = JSON.stringify([
      {
        title: "Career",
        create_time: 1_700_000_000,
        mapping: {
          a: { message: { author: { role: "user" }, content: { content_type: "text", parts: ["I spent four years building insurance software before GridSchool."] } } },
          b: { message: { author: { role: "assistant" }, content: { content_type: "text", parts: ["That is great, here is a long answer."] } } },
          c: { message: { author: { role: "user" }, content: { content_type: "text", parts: ["ok"] } } },
        },
      },
    ]);
    const msgs = chatgptMessages(exportJson);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].source).toBe("chatgpt:2023-11-14:Career");
    const corpus = corpusMessages("# x\n\n*2026-09-05*\n\nI want the portfolio to feel like talking to me, not a chatbot.\n\n---\n\n*2026-09-06*\n\nok", "TRON");
    expect(corpus).toEqual([{ source: "corpus:TRON:2026-09-05", text: "I want the portfolio to feel like talking to me, not a chatbot." }]);
    expect(toBatches(msgs)[0].text).toContain('<message source="chatgpt:2023-11-14:Career">');
  });

  it("drops private facts before anything is written", async () => {
    const fake: LlmClient = {
      provider: "anthropic",
      complete: async () =>
        ({
          value: {
            facts: [
              { claim: "I built the Hire engine.", target: "projects/hire-engine", sensitivity: "professional", confidence: "high", evidence: "built the Hire engine", source: "s1" },
              { claim: "I was sick last week.", target: "me/biography", sensitivity: "Private", confidence: "high", evidence: "sick", source: "s1" },
              { claim: "Something odd.", target: "made/up", sensitivity: "public", confidence: "maybe", evidence: "odd", source: "" },
            ],
          },
          model: "claude-haiku-5-5",
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        }) as never,
    };
    const result = await extractFacts(fake, [{ source: "s1", text: "…" }]);
    expect(result.dropped).toBe(1);
    expect(result.candidates.map((c) => c.target)).toEqual(["projects/hire-engine", "new/unsorted"]);
    expect(result.candidates[1].confidence).toBe("low");
  });

  it("keeps pay, health and family out whatever the model rated them", async () => {
    const { stillPublishable } = await import("../src/ingest/extract");
    expect(stillPublishable("I earn about 100k per year at my job.")).toBe(false);
    expect(stillPublishable("My dad taught me to code.")).toBe(false);
    expect(stillPublishable("I rebuilt a commissions system in Laravel.")).toBe(true);
  });

  it("merges duplicates, round-trips the review file, and promotes ticked facts only", () => {
    const base: Omit<Candidate, "id" | "claim"> = { source: "s", target: "projects/hire-engine", evidence: "e", sensitivity: "professional", confidence: "low", seen: 1 };
    const unique = dedupe([
      { ...base, id: "1", claim: "I built the Hire engine for GridSchool students." },
      { ...base, id: "2", claim: "I built the Hire engine for GridSchool students" },
      { ...base, id: "3", claim: "I built the Hire engine for GridSchool students!" },
      { ...base, id: "4", claim: "I prefer TypeScript.", target: "career/skills-and-stack" },
    ]);
    expect(unique).toHaveLength(2);
    expect(unique[0]).toMatchObject({ seen: 3, confidence: "medium" });

    const md = renderReview(unique, { generatedAt: "now", sources: ["x.json"] }).replace("- [ ] I prefer TypeScript.", "- [x] I prefer TypeScript for servers.");
    const ticked = parseReview(md);
    expect([...ticked.keys()]).toEqual(["career/skills-and-stack"]);
    expect(ticked.get("career/skills-and-stack")).toEqual([{ claim: "I prefer TypeScript for servers.", id: "4" }]);

    const note = "---\nsource: Aden\nstatus: verified\nlast_updated: 2026-01-01\ntitle: Stack\n---\n\nI write TypeScript.\n";
    const merged = mergeIntoNote(note, "career/skills-and-stack", ["I prefer TypeScript for servers."], "2026-10-12");
    expect(merged).toContain("status: draft");
    expect(merged).toContain("## Reviewed facts\n\n- I prefer TypeScript for servers.");
    expect(mergeIntoNote(merged, "career/skills-and-stack", ["I prefer TypeScript for servers."], "2026-10-12")).toBe(merged);
    expect(mergeIntoNote(null, "new/side-projects", ["I make music."], "2026-10-12")).toContain("title: Side projects");
  });
});
