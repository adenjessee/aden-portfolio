import { csvRecords } from "./csv";
import { scrub } from "./pii";
import type { Candidate } from "./types";

/**
 * LinkedIn's data export (Settings > Data privacy > Get a copy of your data) as candidates.
 * Read: Profile, Positions, Education, Skills, Projects, Certifications, Recommendations_Received.
 * Never read: Connections, Messages, Invitations, and other files about other people.
 * Never kept from Profile: address, birth date, zip code, phone, instant messengers.
 */
export const LINKEDIN_FILES = [
  "Profile.csv",
  "Positions.csv",
  "Education.csv",
  "Skills.csv",
  "Projects.csv",
  "Certifications.csv",
  "Recommendations_Received.csv",
] as const;

type Files = Partial<Record<(typeof LINKEDIN_FILES)[number], string>>;

const range = (start?: string, end?: string) => [start, end || "present"].filter(Boolean).join(" to ");

function candidate(source: string, target: string, claim: string, evidence: string, extra: Partial<Candidate> = {}): Candidate {
  return {
    id: source,
    source,
    target,
    claim: scrub(claim.replace(/\s+/g, " ").trim()),
    evidence: scrub(evidence.replace(/\s+/g, " ").trim()).slice(0, 300),
    sensitivity: "professional",
    confidence: "high",
    seen: 1,
    ...extra,
  };
}

export function linkedinCandidates(files: Files): Candidate[] {
  const out: Candidate[] = [];

  for (const [i, r] of csvRecords(files["Profile.csv"] ?? "", "First Name").entries()) {
    if (r.headline) out.push(candidate(`linkedin:Profile.csv#${i}:headline`, "me/biography", `My LinkedIn headline is "${r.headline}".`, r.headline));
    if (r.summary) out.push(candidate(`linkedin:Profile.csv#${i}:summary`, "me/biography", r.summary, r.summary.slice(0, 300)));
    if (r["geo location"]) out.push(candidate(`linkedin:Profile.csv#${i}:geo`, "me/location-and-availability", `I am based in ${r["geo location"]}.`, r["geo location"]));
    if (r.websites) out.push(candidate(`linkedin:Profile.csv#${i}:websites`, "me/contact", `My listed websites: ${r.websites}.`, r.websites, { confidence: "medium" }));
  }

  for (const [i, r] of csvRecords(files["Positions.csv"] ?? "", "Company Name").entries()) {
    const when = range(r["started on"], r["finished on"]);
    const claim = `I worked at ${r["company name"]} as ${r.title}${when ? `, ${when}` : ""}${r.location ? `, in ${r.location}` : ""}.${r.description ? ` ${r.description}` : ""}`;
    out.push(candidate(`linkedin:Positions.csv#${i}`, "career/experience", claim, `${r.title} at ${r["company name"]} (${when})`));
  }

  for (const [i, r] of csvRecords(files["Education.csv"] ?? "", "School Name").entries()) {
    const degree = [r["degree name"], r.notes].filter(Boolean).join(", ");
    const claim = `I studied at ${r["school name"]}${degree ? ` (${degree})` : ""}${r["start date"] || r["end date"] ? `, ${range(r["start date"], r["end date"])}` : ""}.`;
    out.push(candidate(`linkedin:Education.csv#${i}`, "career/experience", claim, `${r["school name"]} ${degree}`));
  }

  const skills = csvRecords(files["Skills.csv"] ?? "", "Name").map((r) => r.name).filter(Boolean);
  if (skills.length) out.push(candidate("linkedin:Skills.csv", "career/skills-and-stack", `Skills on my LinkedIn: ${skills.join(", ")}.`, skills.slice(0, 12).join(", "), { confidence: "medium" }));

  for (const [i, r] of csvRecords(files["Projects.csv"] ?? "", "Title").entries()) {
    out.push(candidate(`linkedin:Projects.csv#${i}`, "projects/client-work", `${r.title}${r.description ? `: ${r.description}` : ""}${r.url ? ` (${r.url})` : ""}`, r.title, { confidence: "medium" }));
  }

  for (const [i, r] of csvRecords(files["Certifications.csv"] ?? "", "Name").entries()) {
    out.push(candidate(`linkedin:Certifications.csv#${i}`, "career/experience", `I hold the ${r.name} certification${r.authority ? ` from ${r.authority}` : ""}${r["started on"] ? ` (${r["started on"]})` : ""}.`, r.name));
  }

  for (const [i, r] of csvRecords(files["Recommendations_Received.csv"] ?? "", "Text").entries()) {
    if ((r.status || "").toUpperCase() !== "VISIBLE" || !r.text) continue;
    // Someone else's words: shown for review with their role only; quoting them publicly needs their OK.
    out.push(
      candidate(`linkedin:Recommendations_Received.csv#${i}`, "career/working-with-me", `A ${r["job title"] || "colleague"}${r.company ? ` at ${r.company}` : ""} recommended me on LinkedIn: "${r.text}"`, r.text.slice(0, 300), {
        confidence: "medium",
      }),
    );
  }

  return out;
}
