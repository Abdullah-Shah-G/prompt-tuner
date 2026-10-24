# Prompt Tuner

Install `requirements.txt`, set `GEMINI_API_KEY` in the environment or `.env`, and run `uvicorn main:app --reload`. Templates support both `{{name}}` and `{{ name }}` placeholders. Batch requests accept up to 50 cases; API temperature values range from 0 to 2.

Evaluator responses are checked against the rubric before use. Unavailable or malformed evaluations fall back to a labeled lexical heuristic; this fallback is not a factual or safety assessment. Token counts use provider metadata where available and are marked approximate otherwise. Saved versions are browser-memory snapshots and disappear on reload.

This is a local demo. Add authentication and request/quota limits before public hosting. Run `python -m unittest -v` after installing `httpx`, with Node.js available, for offline regression tests; no live Gemini calls are made.
