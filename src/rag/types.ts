export type Confidence = "high" | "medium" | "low";

/** verified: true today. draft: written from sources, wording unconfirmed. mock: placeholder Aden still has to replace. */
export type NoteStatus = "verified" | "draft" | "mock";

export type KbChunk = {
  id: string;
  path: string;
  title: string;
  source: string;
  confidence: Confidence;
  status: NoteStatus;
  lastUpdated: string;
  text: string;
};

export type Retrieved = KbChunk & {
  /** Ranking score from whichever retriever produced the hit. Only comparable within one query. */
  score: number;
  /** 0..1 evidence that the chunk answers the query. The no-position threshold reads this. */
  match: number;
  via: "lexical" | "vector" | "hybrid";
};

export type Provenance = {
  id: string;
  path: string;
  title: string;
  claim: string;
  source: string;
  confidence: Confidence;
  status: NoteStatus;
  lastUpdated: string;
  match: number;
  cited: boolean;
};
