"use client";

import { useState } from "react";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
}

export default function PromptEditor({ value, onChange, variables }: PromptEditorProps) {
  const [showVars, setShowVars] = useState(false);

  function insertVar(name: string) {
    onChange(value + `{{${name}}}`);
  }

  return (
    <div className="prompt-editor">
      <div className="editor-header">
        <label>Prompt Template</label>
        <button className="vars-toggle" onClick={() => setShowVars(!showVars)}>
          {showVars ? "Hide" : "Show"} Variables
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write your prompt template here... Use {{variable}} for placeholders."
        rows={8}
      />

      {showVars && variables.length > 0 && (
        <div className="variable-list">
          <span className="var-label">Insert variable:</span>
          {variables.map((v) => (
            <button key={v} className="var-chip" onClick={() => insertVar(v)}>
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}

      <div className="preview-section">
        <label>Template Preview</label>
        <div className="preview-text">
          {value
            ? value.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
                part.match(/\{\{[^}]+\}\}/) ? (
                  <span key={i} className="var-highlight">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )
            : <span className="placeholder">Start typing a template...</span>}
        </div>
      </div>
    </div>
  );
}
