import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { QaOutputSchema, QaOutput } from './qa.schema';
import { SYSTEM_PROMPT, buildUserPrompt } from './qa.prompt';

export interface ConversationInput {
  sessionId?: string;
  messages: string[];
}

export interface QaRecord extends QaOutput {
  recordId: string;
  sessionId: string;
  evaluatedAt: string;
  messageCount: number;
}

@Injectable()
export class QaService {
  private readonly logger = new Logger(QaService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly outputPath: string | null;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: Number(process.env.OPENAI_TIMEOUT_MS ?? 60_000),
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES ?? 3),
    });
    this.model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    const disabled = process.env.QA_JSON_DISABLED === 'true';
    this.outputPath = disabled
      ? null
      : path.resolve(
          process.cwd(),
          process.env.QA_JSON_PATH ?? 'data/qa-records.json',
        );

    if (this.outputPath) {
      const dir = path.dirname(this.outputPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  async evaluate(input: ConversationInput): Promise<QaRecord> {
    const sessionId = input.sessionId ?? `S_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

    this.logger.log(`Evaluating session ${sessionId} — ${input.messages.length} messages`);

    const completion = await this.client.beta.chat.completions.parse({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(sessionId, input.messages) },
      ],
      response_format: zodResponseFormat(QaOutputSchema, 'qa_evaluation'),
      temperature: 0,
    });

    const parsed = completion.choices[0].message.parsed;

    if (!parsed) {
      throw new Error(`Model returned null or refused to parse for session ${sessionId}`);
    }

    const record: QaRecord = {
      recordId: randomUUID(),
      sessionId,
      evaluatedAt: new Date().toISOString(),
      messageCount: input.messages.length,
      ...parsed,
    };

    this.persist(record);
    this.logger.log(`Session ${sessionId} scored ${record.scoreGeral}/10`);

    return record;
  }

  private persist(record: QaRecord): void {
    if (!this.outputPath) return;

    let records: QaRecord[] = [];
    if (fs.existsSync(this.outputPath)) {
      try {
        records = JSON.parse(fs.readFileSync(this.outputPath, 'utf-8'));
      } catch {
        records = [];
      }
    }

    records.push(record);
    fs.writeFileSync(this.outputPath, JSON.stringify(records, null, 2), 'utf-8');
  }
}
