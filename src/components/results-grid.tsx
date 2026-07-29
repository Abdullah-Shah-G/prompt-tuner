"use client";

import type { RunResult, EvaluationScore } from "@/lib/types";

interface ResultsGridProps {
  results: RunResult[];
  scores: Map<string, EvaluationScore>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ResultsGrid({ results, scores, selectedId, onSelect }: ResultsGridProps) {
  if (results.length === 0) return null;

  return (
    <div className="results-grid">
      <div className="section-header">
        <label>Results ({results.length})</label>
      </div>

      <div className="grid-header">
        <span className="col-case">Case</span>
        <span className="col-output">Output</span>
        <span className="col-latency">Latency</span>
        <span className="col-tokens">Tokens</span>
        <span className="col-score">Score</span>
      </div>

      {results.map((r) => {
        const score = scores.get(r.test_case_id);
        return (
          <div
            key={r.test_case_id}
            className={`grid-row ${selectedId === r.test_case_id ? "selected" : ""}`}
            onClick={() => onSelect(r.test_case_id)}
          >
            <span className="col-case">{r.label}</span>
            <span className="col-output">{r.output.slice(0, 120)}{r.output.length > 120 ? "..." : ""}</span>
            <span className="col-latency">{r.latency_ms}ms</span>
            <span className="col-tokens">{r.token_usage}</span>
            <span className={`col-score ${score ? (score.score >= 80 ? "good" : score.score >= 50 ? "ok" : "bad") : ""}`}>
              {score ? `${score.score}/100` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
