export const site = {
  name: "Aden Jessee",
  title: "Aden Jessee. Software engineer.",
  description:
    "Founder of GridSchool. I build graph tools that make repositories understandable, and I teach engineers to defend their work.",
  url: "https://adenjessee.com",
  locale: "en_US",
  github: "https://github.com/adenjessee",
  linkedin: "https://www.linkedin.com/in/aden-jessee-4b3815189",
  email: "aden@gridschool.org",
  gridschool: "https://gridschool.org",
  gridseak: "https://github.com/adenjessee/gridseak",
  location: "Building remotely",
  ogImage: "/og.png",
  posterImage: "/avatar-poster.svg",
} as const;

export const limits = {
  sessionQuestions: 5,
  sessionVoiceSeconds: 180,
  dailyBudgetUsd: 5,
  retrievalThreshold: 0.18,
  retrievalTopK: 6,
} as const;
