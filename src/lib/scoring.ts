import type { ScoreBreakdown } from "./types";

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
}

function ngrams(tokens: string[], n: number): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    result.add(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

function rougeRecall(reference: string, candidate: string): number {
  const refTokens = tokenize(reference);
  const candTokens = tokenize(candidate);
  if (refTokens.length === 0) return 0;
  const refBigrams = ngrams(refTokens, 2);
  const candBigrams = ngrams(candTokens, 2);
  let matches = 0;
  for (const bg of candBigrams) {
    if (refBigrams.has(bg)) matches++;
  }
  return candBigrams.size === 0 ? 0 : matches / candBigrams.size;
}

function tokenLengthPenalty(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length <= 50) return 15;
  if (tokens.length <= 100) return 10;
  if (tokens.length <= 200) return 5;
  return 0;
}

function toxicWordCheck(text: string): number {
  const toxicWords = ["kill", "destroy", "hate", "stupid", "idiot", "damn", "shit"];
  const lower = text.toLowerCase();
  let penalty = 0;
  for (const word of toxicWords) {
    if (lower.includes(word)) penalty += 2;
  }
  return Math.max(0, 10 - penalty);
}

export function heuristicScore(
  reference: string,
  candidate: string
): { total: number; breakdown: ScoreBreakdown } {
  const correctness = Math.round(rougeRecall(reference, candidate) * 40);

  const refTokens = tokenize(reference);
  const candTokens = tokenize(candidate);
  const overlap = refTokens.filter((t) => candTokens.includes(t)).length;
  const relevance = Math.round((overlap / Math.max(refTokens.length, 1)) * 20);

  const concision = tokenLengthPenalty(candidate);

  const refWords = refTokens.length;
  const candWords = candTokens.length;
  const clarityRatio = refWords > 0 ? Math.min(candWords / refWords, 2) / 2 : 0.5;
  const clarity = Math.round(clarityRatio * 15);

  const safety = toxicWordCheck(candidate);

  const total = correctness + relevance + concision + clarity + safety;

  return {
    total: Math.min(total, 100),
    breakdown: {
      correctness: Math.min(correctness, 40),
      relevance: Math.min(relevance, 20),
      concision: Math.min(concision, 15),
      clarity: Math.min(clarity, 15),
      safety: Math.min(safety, 10),
    },
  };
}
