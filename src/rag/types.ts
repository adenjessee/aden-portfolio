export type KbChunk = {
  id: string;
  path: string;
  title: string;
  source: string;
  confidence: "high" | "medium" | "low";
  lastUpdated: string;
  text: string;
};

export type Retrieved = KbChunk & {
  score: number;
};

export type Provenance = {
  claim: string;
  source: string;
  confidence: KbChunk["confidence"];
  lastUpdated: string;
};
