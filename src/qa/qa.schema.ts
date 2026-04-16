import { z } from 'zod';

export const EvidenceSchema = z.object({
  messageIndex: z
    .number()
    .int()
    .min(1)
    .describe('1-based index of the message in the conversation (matches the [N] label in the user prompt)'),
  speaker: z
    .enum(['human', 'ai'])
    .describe('Who sent the message: "human" for the lead, "ai" for Beatriz'),
  excerpt: z
    .string()
    .describe('Exact quote or close paraphrase of the relevant part of the message'),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const DimensionSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .describe('Score from 0 to 10 for this dimension'),
  justification: z
    .string()
    .describe('Objective explanation of the score, grounded in facts from the conversation'),
  evidences: z
    .array(EvidenceSchema)
    .min(1)
    .describe('Structured references to specific messages that support the justification'),
});

export type Dimension = z.infer<typeof DimensionSchema>;

// Schema sent to the LLM — does NOT include overallScore (calculated in code)
export const QaLlmOutputSchema = z.object({
  leadQualification: DimensionSchema.describe(
    'Quality of needs discovery before recommending any course.',
  ),
  recommendationFit: DimensionSchema.describe(
    'Fit between the recommended course(s) and the lead\'s stated profile and objectives.',
  ),
  conversionGuidance: DimensionSchema.describe(
    'Effectiveness guiding the lead toward a concrete next step: enrollment, specialist transfer, or scheduling.',
  ),
  objectionHandling: DimensionSchema.describe(
    'Quality of handling doubts, resistance, and objections — especially price questions, repeated requests, and course comparisons.',
  ),
  communicationClarity: DimensionSchema.describe(
    'Clarity, conciseness, appropriate language, and absence of contradictory or duplicated messages.',
  ),
  contextConsistency: DimensionSchema.describe(
    'Ability to retain conversation context without ignoring previous responses or repeating already-answered questions.',
  ),

  strengths: z
    .array(z.string())
    .describe('List of positive aspects identified in the conversation'),

  improvementAreas: z
    .array(z.string())
    .describe('List of aspects that reduce quality and should be corrected'),

  requiresHumanReview: z
    .boolean()
    .describe('true if the conversation has critical failures requiring immediate human review'),

  reviewReasons: z
    .array(z.string())
    .describe('Reasons that justify human review. Empty if requiresHumanReview is false.'),

  executiveSummary: z
    .string()
    .describe('2 to 4 sentence paragraph with the overall diagnosis, highlighting the most critical improvement point'),
});

export type QaLlmOutput = z.infer<typeof QaLlmOutputSchema>;

// Full output returned by the API (includes fields calculated by the service)
export type QaOutput = QaLlmOutput & { overallScore: number };
