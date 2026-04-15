import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const FIXTURES_PATH = path.resolve(__dirname, '../fixtures/sample-conversations.json');

interface Conversation {
  sessionId: string;
  label: string;
  messages: string[];
}

async function main() {
  const conversations: Conversation[] = JSON.parse(
    fs.readFileSync(FIXTURES_PATH, 'utf-8'),
  );

  console.log(`\nRunning QA evaluation for ${conversations.length} sample conversations...\n`);

  for (const conv of conversations) {
    const res = await fetch(`${BASE_URL}/qa/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: conv.sessionId, messages: conv.messages }),
    });

    if (!res.ok) {
      console.error(`FAIL  ${conv.sessionId}  HTTP ${res.status}`);
      continue;
    }

    const data = await res.json();
    const flag = data.recomendaRevisaoHumana ? '⚠ REVISÃO HUMANA' : '✓';
    console.log(
      `${flag}  ${conv.sessionId}  score=${data.scoreGeral}/10  [${conv.label}]`,
    );
  }

  console.log('\nDone. Results appended to data/qa-records.json\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
