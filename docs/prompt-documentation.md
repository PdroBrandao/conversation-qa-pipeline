# Prompt Documentation

## Overview

The evaluation uses a single system prompt + one dynamically built user prompt per conversation.
Model: `gpt-4o-mini` (default). Temperature: `0` for deterministic output.

---

## System Prompt

**Location:** `src/qa/qa.prompt.ts → SYSTEM_PROMPT`

**Purpose:** Defines the evaluator's role, context about Beatriz and +A Code Academy, scoring rules, weighted average formula, and output language requirements.

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Role framing ("senior quality analyst") | Anchors the model's behaviour to the evaluation task and reduces hallucination of irrelevant commentary |
| Explicit context about Beatriz's process constraints | Prevents the model from penalising correct behaviour (e.g. not disclosing pricing) as a flaw |
| Scoring rubric with numeric anchors (0-3, 4-5, 6-7, 8-9, 10) | Reduces score inflation and forces calibration across conversations |
| Explicit `recomendaRevisaoHumana` trigger conditions | Ensures the flag is grounded in specific, observable events, not general "feeling" |
| `temperature: 0` instruction in scoring rules | Reinforced by API parameter; both reinforce determinism |
| Output language: PT-BR | Matches the language of the conversations being evaluated |

---

## User Prompt

**Location:** `src/qa/qa.prompt.ts → buildUserPrompt()`

**Structure:**
```
SESSION ID: {sessionId}

CONVERSATION:
[1] human: ...
[2] ai: ...
[3] human: ...
...

Evaluate this conversation according to the six quality dimensions defined in your instructions. Return valid JSON matching the required schema.
```

**Key design decisions:**

| Decision | Rationale |
|---|---|
| Messages are numbered `[1]`, `[2]`, etc. | Allows evidence quotes in the output to reference specific turns unambiguously |
| `human:` / `ai:` prefixes preserved | Clarifies speaker role without re-labelling the original data |
| Single instruction at the end | Prevents the model from starting to evaluate before reading the full conversation |

---

## Output Schema

**Location:** `src/qa/qa.schema.ts`

Validated via Zod + OpenAI `zodResponseFormat`. The schema is passed to the API as a JSON Schema, so the model is constrained to produce valid structure.

```
QaRecord
├── recordId                string (uuid)
├── sessionId               string
├── evaluatedAt             ISO 8601
├── messageCount            number
│
│   — LLM output (text values in PT-BR, validated by Zod) —
├── leadQualification       Dimension
├── recommendationFit       Dimension
├── conversionGuidance      Dimension
├── objectionHandling       Dimension
├── communicationClarity    Dimension
├── contextConsistency      Dimension
│     each Dimension:  { score 0-10, justification, evidences[] }
│     each Evidence:   { messageIndex, speaker: "human"|"ai", excerpt }
├── strengths               string[]
├── improvementAreas        string[]
├── requiresHumanReview     boolean
├── reviewReasons           string[]
├── executiveSummary        string
│
│   — Derived fields (calculated in QaService, not by the LLM) —
├── overallScore            number (weighted average, 1 decimal place)
├── businessImpact          "high" | "medium" | "low"
└── recommendedAction       "escalate_for_review" | "individual_coaching"
                            | "standard_monitoring" | "approved"
```

---

## AI Usage Log

This section documents where AI assistance was used in this project, per the challenge requirement.

| Area | Tool | Usage | How it was validated |
|---|---|---|---|
| System prompt drafting | GPT-4.1 (Cursor) | Initial draft of scoring rubric and dimension descriptions | Manually reviewed each rule against the 20 sample conversations; adjusted Beatriz's pricing constraint clause after noticing the model was penalising correct behaviour |
| Zod schema | GPT-4.1 (Cursor) | Suggested `zodResponseFormat` pattern from OpenAI SDK | Verified against OpenAI official docs; tested locally against all 3 sample conversations |
| Architecture write-up | GPT-4.1 (Cursor) | Structured the two-approach comparison | Reviewed for accuracy; added specific cost estimates and migration notes manually |
| Fixtures | Manual | All 3 sample conversations selected and formatted by the author | No AI assistance |
| Scoring calibration | Manual review | Spot-checked model output against manual scoring of 3 conversations | Adjusted rubric twice based on observed score inflation in `gestaoObjecoes` dimension |

---

## Prompt Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | 2025-04-15 | Initial version — 6 dimensions, weighted average, PT-BR output |
