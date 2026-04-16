<p align="center">
  <img src="./logo-mais-a-educacao.svg" alt="+A Educação" height="56" />
</p>

<h1 align="center">conversation-qa-pipeline</h1>

<p align="center">
  AI-powered quality evaluation of customer service conversations — built for +A Code Academy's AI Coordinator selection process.
</p>

---

## What it does

Receives a conversation between a lead and a virtual sales consultant (Beatriz), and returns a structured quality evaluation with scores, justifications, and evidence extracted directly from the conversation.

Designed for WhatsApp and chat channels, with future expansion to voice transcripts in mind.

→ [Architecture Write-Up](./docs/architecture-writeup.md)  
→ [Prompt Documentation](./docs/prompt-documentation.md)  
→ [Sample Output — 1 annotated record](./docs/sample-output.json)

---

## How it works

```
POST /qa/evaluate
        │
        ▼
  Input Validation
        │
        ▼
  OpenAI (gpt-4o-mini) — structured output via Zod schema
        │
        ▼
  6-dimension QA evaluation
        │
        ▼
  QaRecord (JSON) + append to data/qa-records.json
```

---

## Evaluation dimensions

| Dimension | Weight | What it measures |
|---|---|---|
| `leadQualification` | 20% | Needs discovery quality before recommending a course |
| `recommendationFit` | 20% | Fit between course recommendation and lead's stated profile |
| `conversionGuidance` | 20% | Effectiveness guiding the lead toward a concrete next step |
| `objectionHandling` | 15% | Handling of price questions, doubts, and repeated requests |
| `communicationClarity` | 15% | Clarity, conciseness, and language consistency |
| `contextConsistency` | 10% | Context retention across the full conversation |

`scoreGeral` = weighted average, rounded to one decimal place.

---

## Requirements

- Node.js ≥ 18
- An OpenAI API key with access to `gpt-4o-mini` (or configure another model via `OPENAI_MODEL`)

---

## Setup

```bash
git clone <repo-url>
cd conversation-qa-pipeline

npm install

cp .env.example .env
# Add your OPENAI_API_KEY to .env
```

---

## Run

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build && npm run start:prod
```

Server starts at `http://localhost:3000`.

---

## Evaluate the 3 sample conversations

With the server running:

```bash
npm run qa:samples
```

Expected output:

```
Running QA evaluation for 3 sample conversations...

✓  S_cb815acb  score=7.2/10  [Diretora escolar — boa qualificação, condução adequada]
⚠ REVISÃO HUMANA  S_dc7d6256  score=5.8/10  [Mastercoach — múltiplas perguntas, contexto parcialmente perdido]
✓  S_f72ec490  score=6.1/10  [Gestão de riscos — insistência em datas sem resposta satisfatória]

Done. Results appended to data/qa-records.json
```

---

## Single conversation via curl

```bash
curl -s -X POST http://localhost:3000/qa/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "S_example",
    "messages": [
      "human: Oi, tenho interesse em uma pós em IA para negócios",
      "ai: Olá! Eu sou a Beatriz, consultora de carreira da +A Code Academy. Que área de negócios você atua atualmente?",
      "human: Marketing digital",
      "ai: Ótimo! Temos o curso IA para Marketing Estratégico, voltado para quem quer aplicar inteligência artificial em campanhas, análise de dados e personalização. Faz sentido para o seu objetivo?",
      "human: Sim! Qual o valor?"
    ]
  }' | jq .
```

---

## Response schema

```json
{
  "recordId": "uuid",
  "sessionId": "string",
  "evaluatedAt": "ISO 8601",
  "messageCount": 5,
  "leadQualification":    { "score": 0-10, "justification": "...", "evidences": [{ "messageIndex": 3, "speaker": "ai", "excerpt": "..." }] },
  "recommendationFit":    { "score": 0-10, "justification": "...", "evidences": [...] },
  "conversionGuidance":   { "score": 0-10, "justification": "...", "evidences": [...] },
  "objectionHandling":    { "score": 0-10, "justification": "...", "evidences": [...] },
  "communicationClarity": { "score": 0-10, "justification": "...", "evidences": [...] },
  "contextConsistency":   { "score": 0-10, "justification": "...", "evidences": [...] },
  "overallScore": 7.2,
  "strengths": ["..."],
  "improvementAreas": ["..."],
  "requiresHumanReview": false,
  "reviewReasons": [],
  "executiveSummary": "...",
  "businessImpact": "medium",
  "recommendedAction": "standard_monitoring"
}
```

### Derived fields (calculated in code, not by the LLM)

| Field | Values | Logic |
|---|---|---|
| `overallScore` | `0.0–10.0` | Weighted average of 6 dimensions |
| `businessImpact` | `high` / `medium` / `low` | `high` if `overallScore < 6` or `requiresHumanReview`; `low` if `overallScore ≥ 8` |
| `recommendedAction` | `escalate_for_review` / `individual_coaching` / `standard_monitoring` / `approved` | Deterministic from `overallScore` + `requiresHumanReview` |

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Required |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use |
| `OPENAI_TIMEOUT_MS` | `60000` | Request timeout (ms) |
| `OPENAI_MAX_RETRIES` | `3` | SDK retries with exponential backoff |
| `QA_JSON_PATH` | `data/qa-records.json` | Output file path (relative to cwd) |
| `QA_JSON_DISABLED` | `false` | Set to `true` to skip disk writes |

---

**Author:** Pedro Brandão · [pdrobrandao.com](https://pdrobrandao.com) · [LinkedIn](https://linkedin.com/in/pdrobrandao)
