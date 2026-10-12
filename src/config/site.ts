export const site = {
  name: "Aden Jessee",
  title: "Aden Jessee. Applied AI engineer.",
  description:
    "I build applied AI and agentic graph engineering systems: maps of how a codebase fits together, and agents whose changes a team can check. Founder of GridSchool.",
  url: "https://adenjessee.com",
  locale: "en_US",
  github: "https://github.com/adenjessee",
  linkedin: "https://www.linkedin.com/in/aden-jessee-4b3815189",
  email: "aden@gridschool.org",
  gridschool: "https://gridschool.org",
  gridseak: "https://github.com/adenjessee/gridseak",
  repo: "https://github.com/adenjessee/aden-portfolio",
  location: "Boise, Idaho · Mountain time",
  // Empty until Aden picks a scheduling link. The book_call action falls back to email while it is empty.
  bookingUrl: "",
  ogImage: "/og.png",
  posterImage: "/avatar-poster.svg",
} as const;

export const limits = {
  sessionQuestions: 5,
  sessionVoiceSeconds: 180,
  dailyBudgetUsd: 5,
  /** Minimum idf-weighted coverage (0..1) for a note to count as a position on record. Tuned against evals/cases.json. */
  retrievalThreshold: 0.5,
  retrievalTopK: 6,
  /** Prior turns sent with each question so follow-ups make sense. */
  historyTurns: 4,
  /** A fit check reads a whole job description, so it spends two of the visit's live questions. */
  fitCheckCost: 2,
  messagesPerSession: 2,
} as const;
