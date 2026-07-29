"use client";

import type { RunResult, EvaluationScore } from "@/lib/types";

interface ComparisonViewProps {
  results: RunResult[];
  scores: Map<string, EvaluationScore>;
}

export default function ComparisonView({ results, scores }: ComparisonViewProps) {
  if (results.length < 2) {
    return (
      <div className="comparison-view">
        <div className="section-header"><label>Comparison</label></div>
        <p className="empty-hint">Run batch evaluation to compare outputs side by side.</p>
      </div>
    );
  }

  return (
    <div className="comparison-view">
      <div className="section-header">
        <label>Comparison ({results.length} outputs)</label>
      </div>

      <div className="comparison-grid">
        {results.map((r) => {
          const score = scores.get(r.test_case_id);
          return (
            <div key={r.test_case_id} className="comparison-card">
              <div className="comp-header">
                <strong>{r.label}</strong>
                {score && <span className={`comp-score ${score.score >= 80 ? "good" : score.score >= 50 ? "ok" : "bad"}`}>{score.score}</span>}
              </div>
              <div className="comp-meta">
                {r.latency_ms}ms · {r.token_usage} tokens
              </div>
              <div className="comp-output">{r.output}</div>
              {score && (
                <div className="comp-breakdown">
                  {Object.entries(score.breakdown).map(([k, v]) => (
                    <span key={k} className="bdg">{k}:{v}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
