"use client";

import type { RunResult, EvaluationScore } from "@/lib/types";

interface EvaluationPanelProps {
  result: RunResult | null;
  score: EvaluationScore | null;
  reference: string;
  onReferenceChange: (val: string) => void;
  onEvaluate: () => void;
  loading: boolean;
}

const CRITERIA_LABELS: Record<string, string> = {
  correctness: "Correctness (40)",
  relevance: "Relevance (20)",
  concision: "Concision (15)",
  clarity: "Clarity (15)",
  safety: "Safety (10)",
};

export default function EvaluationPanel({
  result,
  score,
  reference,
  onReferenceChange,
  onEvaluate,
  loading,
}: EvaluationPanelProps) {
  return (
    <div className="evaluation-panel">
      <div className="section-header">
        <label>Evaluation</label>
      </div>

      {!result ? (
        <p className="empty-hint">Select a result to evaluate.</p>
      ) : (
        <>
          <div className="eval-section">
            <label>Reference Output</label>
            <textarea
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
              placeholder="Enter the expected/reference output..."
              rows={3}
            />
          </div>

          <div className="eval-section">
            <label>Candidate Output</label>
            <div className="candidate-output">{result.output}</div>
          </div>

          <button className="eval-btn" onClick={onEvaluate} disabled={loading || !reference.trim()}>
            {loading ? "Evaluating..." : "Evaluate"}
          </button>

          {score && (
            <div className="score-card">
              <div className="score-total">
                <span className="score-value">{score.score}</span>
                <span className="score-max">/100</span>
              </div>

              <div className="criteria-bars">
                {Object.entries(score.breakdown).map(([key, val]) => (
                  <div key={key} className="criterion">
                    <div className="criterion-header">
                      <span className="crit-label">{CRITERIA_LABELS[key] || key}</span>
                      <span className="crit-value">{val}</span>
                    </div>
                    <div className="crit-bar">
                      <div
                        className="crit-fill"
                        style={{
                          width: `${(val / parseInt(key === "correctness" ? "40" : key === "relevance" ? "20" : key === "concision" ? "15" : key === "clarity" ? "15" : "10")) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {score.reason && (
                <div className="score-reason">
                  <strong>Reason:</strong> {score.reason}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
