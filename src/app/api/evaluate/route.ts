import { NextResponse } from "next/server";
import { evaluateOutputs } from "@/lib/openai";
import { heuristicScore } from "@/lib/scoring";
import type { EvaluateRequest, EvaluationScore, ScoreBreakdown } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: EvaluateRequest = await request.json();
    const { task_description, reference, candidates } = body;

    let llmScores: EvaluationScore[] = [];

    try {
      const raw = await evaluateOutputs(task_description, reference, candidates);
      const jsonMatch = raw.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        llmScores = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch {
      // LLM evaluation failed, use heuristic fallback
    }

    const scores: EvaluationScore[] = candidates.map((c) => {
      if (llmScores.length > 0) {
        const found = llmScores.find((s) => s.candidate_id === c.id);
        if (found) return found;
      }

      const heuristic = heuristicScore(reference, c.output);
      return {
        candidate_id: c.id,
        score: heuristic.total,
        breakdown: heuristic.breakdown,
        reason: "Heuristic score (LLM evaluator unavailable)",
      };
    });

    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Evaluate error:", error);
    return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
  }
}
