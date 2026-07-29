"use client";

import type { PromptVersion } from "@/lib/types";

interface LeaderboardProps {
  versions: PromptVersion[];
  onRestore: (v: PromptVersion) => void;
  onClear: () => void;
}

export default function PromptLeaderboard({ versions, onRestore, onClear }: LeaderboardProps) {
  if (versions.length === 0) {
    return (
      <div className="leaderboard">
        <div className="section-header"><label>Saved Prompts</label></div>
        <p className="empty-hint">No saved prompts yet. Run evaluations and save your best versions.</p>
      </div>
    );
  }

  const sorted = [...versions].sort((a, b) => b.avg_score - a.avg_score);

  return (
    <div className="leaderboard">
      <div className="section-header">
        <label>Saved Prompts ({versions.length})</label>
        <button className="clear-btn" onClick={onClear}>Clear All</button>
      </div>

      <div className="lb-header">
        <span className="lb-rank">#</span>
        <span className="lb-score">Score</span>
        <span className="lb-preview">Prompt</span>
        <span className="lb-date">Saved</span>
        <span className="lb-action" />
      </div>

      {sorted.map((v, i) => (
        <div key={v.id} className={`lb-row ${i === 0 ? "top" : ""}`}>
          <span className="lb-rank">{i === 0 ? "★" : i + 1}</span>
          <span className="lb-score">{v.avg_score.toFixed(0)}</span>
          <span className="lb-preview">{v.prompt.slice(0, 80)}{v.prompt.length > 80 ? "..." : ""}</span>
          <span className="lb-date">{new Date(v.timestamp).toLocaleDateString()}</span>
          <span className="lb-action">
            <button className="restore-btn" onClick={() => onRestore(v)}>
              Restore
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
