// Разбор ответа модели в формате «<размышление>…</размышление><ответ>…</ответ>».
// Гостю уходит только ответ, размышление идёт в консоль. Чистая логика без сети.

const THINK_RE = /<размышление>([\s\S]*?)<\/размышление>/i;
const ANSWER_RE = /<ответ>([\s\S]*?)<\/ответ>/i;
const ANY_TAG_RE = /<\/?(?:размышление|ответ)>/gi;

const clean = (s) => s.replace(ANY_TAG_RE, '').trim();

// Возвращает {thinking, answer, tagged}. tagged: false, если модель не использовала теги.
// answer может быть пустым (модель оборвалась посреди размышления): решает вызывающий код.
export function splitReasoning(raw) {
  const text = String(raw ?? '');
  const thinkMatch = text.match(THINK_RE);
  let thinking = thinkMatch ? clean(thinkMatch[1]) : '';

  // 1. Нормальный случай: закрытый <ответ>
  const answerMatch = text.match(ANSWER_RE);
  if (answerMatch) return { thinking, answer: clean(answerMatch[1]), tagged: true };

  // 2. <ответ> открыт, но не закрыт (ответ обрезало по max_tokens): берём всё после тега
  const open = text.search(/<ответ>/i);
  if (open >= 0) {
    if (!thinking) thinking = clean(text.slice(0, open));
    return { thinking, answer: clean(text.slice(open)), tagged: true };
  }

  // 3. Тега ответа нет: вырезаем размышление и отправляем остальное
  let rest = text.replace(new RegExp(THINK_RE.source, 'gi'), '');
  const unclosed = rest.search(/<размышление>/i);
  if (unclosed >= 0) {
    // размышление не закрыто: модель оборвалась, ответа нет
    if (!thinking) thinking = clean(rest.slice(unclosed));
    rest = rest.slice(0, unclosed);
  } else {
    // закрывающий тег есть, а открывающего нет: всё до него — размышление
    const stray = rest.search(/<\/размышление>/i);
    if (stray >= 0) {
      if (!thinking) thinking = clean(rest.slice(0, stray));
      rest = rest.slice(stray);
    }
  }
  return { thinking, answer: clean(rest), tagged: thinkMatch !== null || unclosed >= 0 };
}
