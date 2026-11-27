// Сравнение: одна бесплатная модель, 3 трудных вопроса из test_cases.md, рассуждение выключено и включено.
// Всего 6 запросов, без повторов и запасных моделей. Запуск: node compare.js [файл отчёта]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
// bot.js при импорте сам читает .env, а бота не запускает
import { buildSystemPrompt } from './bot.js';

const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'; // поддерживает effort: none и high
const EFFORTS = [
  ['none', 'выключено'],
  ['high', 'включено'],
];
const MAX_TOKENS = 8000; // токены рассуждения входят в этот предел
const TIMEOUT_MS = 300_000;
const OUTPUT = process.argv[2] ?? new URL('./comparison_effort.md', import.meta.url);

// Готовый отчёт не перезаписываем: случайный повторный запуск стёр бы результаты
if (existsSync(OUTPUT)) {
  console.error('Файл отчёта уже есть. Удали его или укажи другое имя: node compare.js другое_имя.md');
  process.exit(1);
}

// Вопросы: строки «**Гость:** …» из раздела «# Трудные вопросы»
function readQuestions() {
  const text = readFileSync(new URL('./test_cases.md', import.meta.url), 'utf8');
  const section = text.split(/^# Трудные вопросы[ \t]*\r?$/m)[1]?.split(/^# /m)[0] ?? '';
  return [...section.matchAll(/^\*\*Гость:\*\*[ \t]*(.+?)[ \t]*\r?$/gm)].map((m) => m[1]);
}

async function run(system, question, effort) {
  const started = performance.now();
  const seconds = () => (performance.now() - started) / 1000;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: question },
        ],
        reasoning: { effort },
        max_tokens: MAX_TOKENS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await res.text();
    const time = seconds();
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // не JSON: ниже запишем как ошибку
    }
    const choice = data?.choices?.[0];
    if (!res.ok || !choice) {
      return { time, error: `HTTP ${res.status}: ${data?.error?.message ?? raw.slice(0, 300)}` };
    }
    return {
      time,
      answer: choice.message?.content?.trim() ?? '',
      reasoning: choice.message?.reasoning?.trim() ?? '',
      usage: data.usage ?? {},
      finish: choice.finish_reason ?? '—',
      model: data.model ?? '—',
      provider: data.provider ?? '—',
    };
  } catch (err) {
    return { time: seconds(), error: err.message };
  }
}

const cell = (s) => String(s).replaceAll('|', '\\|').replace(/\r?\n+/g, '<br>');
const value = (x) => x ?? '—';
const quote = (s) => s.split(/\r?\n/).map((l) => `> ${l}`.trimEnd()).join('\n');

function report(questions, results, startedAt) {
  const rows = results.map((r) => {
    const u = r.usage ?? {};
    const answer = r.error ? `Ошибка: ${r.error}` : r.answer || '(пустой ответ)';
    return `| ${r.q + 1} | ${r.label} (\`${r.effort}\`) | ${cell(answer)} | ${r.time.toFixed(1)} | ${value(u.prompt_tokens)} | ${value(u.completion_tokens)} | ${value(u.completion_tokens_details?.reasoning_tokens)} | ${value(u.total_tokens)} | ${value(r.finish)} |`;
  });
  const details = results.map((r) => {
    const body = r.reasoning ? quote(r.reasoning) : r.error ? '_Нет: запрос завершился ошибкой._' : '_Пусто: поле `message.reasoning` не пришло или в нём нет текста._';
    const meta = r.error ? '' : `\n\nМодель в ответе API: \`${r.model}\`, провайдер: ${r.provider}.`;
    return `### Вопрос ${r.q + 1}, рассуждение ${r.label}${meta}\n\n${body}`;
  });

  return `# Параметр reasoning: effort none и high

- Запуск: ${startedAt} (UTC).
- Модель: \`${MODEL}\`.
- System prompt: \`buildSystemPrompt(false)\` из [bot.js](bot.js), то есть без тегов \`<размышление>\`. Он одинаковый во всех запросах.
- Различается только параметр \`reasoning.effort\`: \`none\` или \`high\`. \`max_tokens\`: ${MAX_TOKENS}.
- Без стража, напоминания правил, повторов и запасных моделей. Ответы не редактировались (в таблице переносы строк заменены на \`<br>\`).
- Выполнено запросов: ${results.length} из ${questions.length * EFFORTS.length}. По одному на вариант, поэтому это иллюстрация, а не статистика.

## Вопросы

${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## Таблица

«Выход» — это \`completion_tokens\`. «Из них на рассуждение» — \`completion_tokens_details.reasoning_tokens\`. Прочерк значит, что API не прислал значение.

| Вопрос | Рассуждение | Ответ | Время, с | Вход | Выход | Из них на рассуждение | Всего токенов | finish_reason |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Тексты рассуждения (\`message.reasoning\`)

${details.join('\n\n')}
`;
}

const questions = readQuestions();
if (questions.length !== 3) {
  console.error(`Ожидалось 3 вопроса в разделе «Трудные вопросы», найдено: ${questions.length}`);
  process.exit(1);
}

const system = buildSystemPrompt(false);
const startedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
const results = [];
for (const [q, question] of questions.entries()) {
  for (const [effort, label] of EFFORTS) {
    const result = { q, effort, label, ...(await run(system, question, effort)) };
    results.push(result);
    // Сохраняем после каждого запроса, чтобы сбой не стёр уже полученное
    writeFileSync(OUTPUT, report(questions, results, startedAt), 'utf8');
    console.log(`Вопрос ${q + 1}, ${effort}: ${result.time.toFixed(1)} с, ${result.error ?? `токенов ${value(result.usage.total_tokens)}`}`);
  }
}
console.log(`Готово. Успешных: ${results.filter((r) => !r.error).length} из ${results.length}.`);
