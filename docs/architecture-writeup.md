# Architecture Write-Up — Conversation QA Pipeline

## Problem

+A Code Academy operates AI-assisted sales consultants ("Beatriz") across WhatsApp and chat. As conversation volume grows, manually auditing agent performance becomes a bottleneck. The goal is to automatically evaluate the quality of each conversation and surface actionable feedback — supporting, not replacing, the human QA team.

---

## Constraints & Design Principles

| Constraint | Impact on design |
|---|---|
| Economically viable | Favour cheaper models; single-pass over multi-agent |
| Auditable & traceable | All scores must be grounded in evidence from the conversation |
| Criteria must evolve | Schema and prompt must be versioned and decoupled |
| Initial use is human-assisted | Output is decision support, not autonomous action |
| Conversations may contain sensitive data | No conversation content logged to external services beyond the LLM call |
| Must scale | Stateless endpoint; each request is independent |

---

## Architecture Overview

```
POST /qa/evaluate
        │
        ▼
  Input Validation (NestJS guard)
        │
        ▼
  QA Service
        │
        ├── Build prompt (system + user)
        │
        ├── Call OpenAI (gpt-4o-mini, structured output via Zod schema)
        │
        ├── Validate parsed output (Zod)
        │
        └── Persist record to data/qa-records.json
                │
                ▼
        Return QaRecord (JSON)
```

The flow is intentionally linear. There is no orchestration layer, no agent loop, and no branching — routing decisions are deterministic code, not model decisions.

---

## Approach Comparison

### Option A — Single-Prompt, Structured Output (adopted for MVP)

One LLM call evaluates all six dimensions simultaneously, returning a typed JSON object.

**How it works:**
1. System prompt defines evaluation criteria, scoring rubric, and output rules.
2. User prompt injects the full conversation.
3. OpenAI `response_format: json_schema` (via `zodResponseFormat`) guarantees the structure.
4. Zod validates the parsed output before returning.

**Advantages:**
- Simple to deploy, test, and debug.
- Single API call → low latency and low cost.
- Criteria are entirely in the prompt — easy to update without code changes.
- Output is deterministic given `temperature: 0`.
- Full traceability: one input → one output → one record.

**Limitations:**
- All dimensions share the same context window — a very long conversation may dilute attention across dimensions.
- Adding new dimensions requires re-prompting the entire evaluation.
- The model cannot "focus" independently on each criterion.

**Best suited for:** MVP, moderate conversation lengths (< ~3,000 tokens), teams that want fast iteration on criteria.

---

### Option B — Multi-Step Pipeline (recommended for production scale)

The conversation is processed in three sequential LLM calls:

1. **Extraction pass** — extract named entities, key events, objections, and topic transitions from the raw conversation.
2. **Scoring pass** — evaluate each dimension independently using the extracted structure (not the raw text).
3. **Synthesis pass** — generate the executive summary, highlight top strengths and improvement opportunities.

**Advantages:**
- Each call is smaller and more focused → better accuracy per dimension.
- Extraction output can be cached and reused across different evaluation rubrics.
- Easier to A/B test individual scoring dimensions without affecting others.
- More resilient to long conversations.

**Limitations:**
- 3× API calls → 3× cost and ~3× latency.
- More moving parts — harder to debug when a dimension is wrong.
- Extraction quality becomes a dependency for all downstream scores.

**Best suited for:** Production QA with high conversation volumes, multi-rubric evaluations (e.g. different criteria for onboarding vs. upsell flows), or when conversation length consistently exceeds 2,000 tokens.

---

## Decision: MVP adopts Option A

For the current scope — 20 sample conversations, median length ~12 messages — Option A is the right choice. Cost per evaluation with `gpt-4o-mini` is under $0.001 USD. At 10,000 evaluations/month the cost is < $10 USD.

The schema is designed so that migrating to Option B later requires no breaking changes to the API contract — only the internal implementation of `QaService.evaluate()` changes.

---

## Evaluation Dimensions

| Dimension | Weight | What it measures |
|---|---|---|
| `qualificacaoLead` | 20% | Quality of needs discovery before recommending a course |
| `adequacaoRecomendacao` | 20% | Fit between the recommended course and the lead's stated profile |
| `conducaoConversao` | 20% | Effectiveness in guiding the lead toward a concrete next step |
| `gestaoObjecoes` | 15% | Handling of price questions, doubts, and repeated requests |
| `clarezaComunicacao` | 15% | Clarity, conciseness, and consistency of language |
| `consistenciaContexto` | 10% | Context retention across the full conversation |

`scoreGeral` = weighted sum, rounded to one decimal place.

---

## Human Review Flag

`recomendaRevisaoHumana: true` is triggered when any of the following conditions are detected:

- The agent provides factually incorrect information about a course.
- The agent ignores or misunderstands a clearly stated need (after the lead has repeated it).
- The lead asks the same question three or more times without a satisfactory answer.
- The conversation ends with no next step offered.
- Sensitive data (CPF, financial details) is requested or exposed incorrectly.

---

## Product Integration

Each `QaRecord` is a self-contained analytical unit. The table below maps output fields to concrete product actions:

| Output field | Product action |
|---|---|
| `scoreGeral` | Weekly operator ranking dashboard — surfaces top and bottom performers |
| `recomendaRevisaoHumana: true` | Triggers priority queue for QA analyst review (SLA: same day) |
| `oportunidadesMelhoria` | Feeds personalised coaching feed per operator version |
| `gestaoObjecoes.score < 6` | Flags conversation for pricing-script review |
| `consistenciaContexto.score < 5` | Signals potential context-window issue in the agent's underlying architecture |
| `conducaoConversao.score` | Correlates with conversion rate — tracked weekly per channel |

### Suggested downstream architecture

```
POST /qa/evaluate
        │
        ▼
   QaRecord (JSON)
        │
   ┌────┴──────────────────────────────────┐
   ▼                                       ▼
Analytics store                    Review queue
(BigQuery / Metabase)         (recomendaRevisaoHumana=true)
   │                                       │
   ▼                                       ▼
Weekly score dashboard          QA analyst inbox
Operator ranking                Same-day review SLA
Trend alerts
```

---

## Operational Vision

### Monitoring
- All `QaRecord` objects are appended to `data/qa-records.json` (configurable path).
- A downstream analytics layer (e.g. Metabase, BigQuery) can track score trends per week, per channel, per operator version.

### Evolving Criteria
- Criteria live in `src/qa/qa.prompt.ts` and `src/qa/qa.schema.ts`.
- Adding a new dimension = add field to Zod schema + update system prompt. No breaking API changes.

### Model Upgrades
- `OPENAI_MODEL` is an env var. Upgrading from `gpt-4o-mini` to `gpt-4o` or `gpt-4.1` requires only a config change.
- Recommended: maintain a labelled benchmark set (e.g. 20 manually-scored conversations) and run regression before changing the model or prompt.

### Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Model hallucinates evidence | `temperature: 0`; structured evidence with `messageIndex` enables spot-check; human review flag for borderline cases |
| Score inflation ("LLM bonzinho") | Hard scoring rules in prompt: score ≥ 8 requires explicit positive evidence; identified flaw caps dimension at 6 |
| Prompt drift over time | Version the system prompt; keep a changelog in `docs/prompt-documentation.md` |
| Sensitive data in logs | No conversation content is logged; only `sessionId` and scores are written to records |
| Latency spikes | OpenAI SDK retries with exponential backoff (configurable via `OPENAI_MAX_RETRIES`) |
| scoreGeral inconsistency | Weighted average is calculated in code (`qa.service.ts`), not delegated to the LLM — deterministic by design |
