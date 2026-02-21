export const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const
export type Quarter = (typeof QUARTERS)[number]
export type QuarterNumber = 1 | 2 | 3 | 4
