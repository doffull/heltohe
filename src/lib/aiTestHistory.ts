export interface AiTestRecord {
  scope: string;
  model: string;
  ok: boolean;
  message: string;
  at: string; // ISO date
}

const KEY = 'hmp_ai_test_history_v1';

export const AI_TEST_SCOPE_LABELS: Record<string, string> = {
  chat: 'Chatbot',
  voice: 'Commande vocale',
  default: 'Textes & générateurs',
  vision: 'Vision (images, PDF)',
};

export function readAiTests(): Record<string, AiTestRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAiTest(record: AiTestRecord): Record<string, AiTestRecord> {
  const all = readAiTests();
  all[record.scope] = record;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
  return all;
}

export function formatAiTestDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
