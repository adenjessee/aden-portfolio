/** The five mouth shapes every VRM model defines. */
export const visemes = ["aa", "ih", "ou", "ee", "oh"] as const;
export type Viseme = (typeof visemes)[number];
