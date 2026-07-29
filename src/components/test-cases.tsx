"use client";

import { useState } from "react";
import type { TestCase, CaseInput } from "@/lib/types";

interface TestCasesProps {
  variables: string[];
  testCases: TestCase[];
  onChange: (cases: TestCase[]) => void;
}

export default function TestCases({ variables, testCases, onChange }: TestCasesProps) {
  function addCase() {
    const inputs: Record<string, string> = {};
    variables.forEach((v) => (inputs[v] = ""));
    const newCase: TestCase = {
      id: String(Date.now()),
      label: `Test ${testCases.length + 1}`,
      inputs,
    };
    onChange([...testCases, newCase]);
  }

  function removeCase(id: string) {
    onChange(testCases.filter((tc) => tc.id !== id));
  }

  function updateLabel(id: string, label: string) {
    onChange(testCases.map((tc) => (tc.id === id ? { ...tc, label } : tc)));
  }

  function updateInput(id: string, variable: string, value: string) {
    onChange(
      testCases.map((tc) =>
        tc.id === id
          ? { ...tc, inputs: { ...tc.inputs, [variable]: value } }
          : tc
      )
    );
  }

  return (
    <div className="test-cases">
      <div className="section-header">
        <label>Test Cases ({testCases.length})</label>
        <button onClick={addCase} disabled={variables.length === 0}>
          + Add Case
        </button>
      </div>

      {testCases.length === 0 && (
        <p className="empty-hint">
          {variables.length === 0
            ? "Add variables to your template to create test cases."
            : "Click '+ Add Case' to create test inputs."}
        </p>
      )}

      {testCases.map((tc) => (
        <div key={tc.id} className="test-case-card">
          <div className="tc-header">
            <input
              className="tc-label"
              value={tc.label}
              onChange={(e) => updateLabel(tc.id, e.target.value)}
              placeholder="Test case label"
            />
            <button className="tc-remove" onClick={() => removeCase(tc.id)}>
              ×
            </button>
          </div>
          {variables.map((v) => (
            <div key={v} className="tc-input-row">
              <span className="tc-var">{`{{${v}}}`}</span>
              <input
                value={tc.inputs[v] || ""}
                onChange={(e) => updateInput(tc.id, v, e.target.value)}
                placeholder={`Enter value for ${v}...`}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
