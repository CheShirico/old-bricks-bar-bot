// Диалог оформления заявки на бронь стола. Чистая логика без сети: удобно тестировать.
import { HOURS, DAYS_RU } from './schedule.js';

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAY_STEMS = [
  ['понедельник', 1],
  ['вторник', 2],
  ['сред', 3],
  ['четверг', 4],
  ['пятниц', 5],
  ['суббот', 6],
  ['воскресен', 0],
];
const WEEKDAY_SHORT = { пн: 1, вт: 2, ср: 3, чт: 4, пт: 5, сб: 6, вс: 0 };
const DAY_MS = 86_400_000;
const MAX_DAYS_AHEAD = 120;
const MAX_GUESTS = 50;

const pad = (n) => String(n).padStart(2, '0');

// Фразы, по которым бот сам предлагает оформить заявку на бронь
export const BOOKING_INTENT_RE = /забронир|брониров|бронь|резерв|столик на|заказать стол/i;
export const CANCEL_RE = /^(\/cancel|\/reset|\/start|отмена|отменить|отмени|стоп)$/i;

function makeDate(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return { ms, weekday: d.getUTCDay(), iso: `${y}-${pad(m)}-${pad(day)}`, label: `${pad(day)}.${pad(m)}.${y} (${DAYS_RU[d.getUTCDay()]})` };
}

// now — результат almatyNow(). Возвращает {ms, weekday, iso, label} или null.
export function parseDate(input, now) {
  const t = input.toLowerCase().replaceAll('ё', 'е').trim();
  const today = Date.UTC(now.year, now.month - 1, now.day);

  if (t.includes('послезавтра')) return makeDate(today + 2 * DAY_MS);
  if (t.includes('завтра')) return makeDate(today + DAY_MS);
  if (t.includes('сегодня')) return makeDate(today);

  let day = null;
  let month = null;
  let year = null;
  let m = t.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/);
  if (m) {
    day = Number(m[1]);
    month = Number(m[2]);
    if (m[3]) year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  } else {
    m = t.match(new RegExp(`(\\d{1,2})\\s*(${MONTHS.join('|')})`));
    if (m) {
      day = Number(m[1]);
      month = MONTHS.indexOf(m[2]) + 1;
    }
  }
  if (day !== null) {
    const build = (y) => {
      const ms = Date.UTC(y, month - 1, day);
      const d = new Date(ms);
      return d.getUTCMonth() + 1 === month && d.getUTCDate() === day ? ms : null;
    };
    let ms = build(year ?? now.year);
    if (ms !== null && year === null && ms < today) ms = build(now.year + 1); // «5 января» в декабре — это следующий год
    return ms === null ? null : makeDate(ms);
  }

  let target = WEEKDAY_STEMS.find(([stem]) => t.includes(stem))?.[1];
  if (target === undefined) target = WEEKDAY_SHORT[t.replace(/[^а-я]/g, '')];
  if (target !== undefined) {
    let delta = (target - now.weekday + 7) % 7;
    if (delta === 0 && t.includes('следующ')) delta = 7;
    return makeDate(today + delta * DAY_MS);
  }
  return null;
}

// Возвращает {h, min, label} или null. Бар работает с 15:00, поэтому «7» и «7:30» читаем как вечер.
export function parseTime(input) {
  const t = input.toLowerCase().trim();
  const m = t.match(/(\d{1,2})(?:\s*[:.]\s*(\d{2}))?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  const evening = /веч|дня|пополудни/.test(t);
  const morning = /утра|ночи/.test(t);
  if (evening && h < 12) h += 12;
  else if (!evening && !morning && h >= 3 && h <= 10) h += 12; // 11 и 12 не трогаем: «23:00» гость напишет полностью
  return { h, min, label: `${pad(h)}:${pad(min)}` };
}

export function normalizePhone(input) {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '8' || digits[0] === '7')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length >= 11 && digits.length <= 15 && input.trim().startsWith('+')) return `+${digits}`;
  return null;
}

function validateDate(date, now) {
  const today = Date.UTC(now.year, now.month - 1, now.day);
  if (date.ms < today) return 'Эта дата уже прошла. Укажите, пожалуйста, будущую дату.';
  if (date.ms > today + MAX_DAYS_AHEAD * DAY_MS) return 'Это слишком далёкая дата. Укажите дату поближе или позвоните нам: +7 705 168 79 69.';
  if (!HOURS[date.weekday]) {
    return `В этот день (${DAYS_RU[date.weekday]}) мы не работаем: понедельник, вторник и среда — выходные. Выберите четверг, пятницу, субботу или воскресенье.`;
  }
  return null;
}

function validateTime(date, time, now) {
  const [open, close] = HOURS[date.weekday];
  const t = time.h * 60 + time.min;
  if (t < open * 60) {
    const late = time.h <= 2 ? ' Если нужно позже полуночи, позвоните нам: +7 705 168 79 69.' : '';
    return `В этот день мы работаем с ${pad(open)}:00. Выберите время с ${pad(open)}:00.${late}`;
  }
  if (t >= Math.min(close, 24) * 60) return 'Это время уже после закрытия. Выберите время раньше.';
  const today = Date.UTC(now.year, now.month - 1, now.day);
  if (date.ms === today && t <= now.minutes) return 'Это время уже прошло. Выберите более позднее время.';
  return null;
}

function summary(data) {
  return [
    `Дата: ${data.dateLabel}`,
    `Время: ${data.time}`,
    `Гостей: ${data.guests}`,
    `Имя: ${data.name}`,
    `Телефон: ${data.phone}`,
    `Комментарий: ${data.comment || '—'}`,
  ].join('\n');
}

export const CONFIRM_KEYBOARD = [['Отправить заявку', 'Отменить']];

export function startBooking() {
  return {
    state: { step: 'date', data: {} },
    reply:
      'Оформим заявку на бронь стола. Администратор проверит свободные места и подтвердит бронь. ' +
      'Отменить можно в любой момент, написав «отмена».\n\n' +
      'На какую дату? Например: пятница, завтра, 28.11 или 28 ноября. Мы работаем с четверга по воскресенье.',
  };
}

// Один шаг диалога. state: {step, data}. Возвращает {state, reply, keyboard?, submit?}.
// state === null в ответе — диалог закончен (отмена или заявка готова к отправке).
export function bookingStep(state, rawText, now) {
  const text = rawText.trim();
  const { step, data } = state;
  const again = (reply) => ({ state, reply });
  const next = (nextStep, patch, reply, keyboard) => ({ state: { step: nextStep, data: { ...data, ...patch } }, reply, keyboard });

  if (CANCEL_RE.test(text)) return { state: null, reply: 'Хорошо, заявку отменили. Если передумаете, напишите «хочу забронировать».', cancelled: true };

  switch (step) {
    case 'date': {
      const date = parseDate(text, now);
      if (!date) return again('Не понял дату. Напишите, например: пятница, завтра, 28.11 или 28 ноября.');
      const err = validateDate(date, now);
      if (err) return again(err);
      return next('time', { dateISO: date.iso, dateLabel: date.label, weekday: date.weekday, dateMs: date.ms }, `Дата: ${date.label}. На какое время? Например: 19:00.`);
    }
    case 'time': {
      const time = parseTime(text);
      if (!time) return again('Не понял время. Напишите, например: 19:00.');
      const err = validateTime({ ms: data.dateMs, weekday: data.weekday }, time, now);
      if (err) return again(err);
      return next('guests', { time: time.label }, `Время: ${time.label}. Сколько будет гостей?`);
    }
    case 'guests': {
      const n = Number(text.match(/\d+/)?.[0]);
      if (!n || n < 1) return again('Напишите число гостей цифрой, например: 4.');
      if (n > MAX_GUESTS) return again('Для такой большой компании лучше позвонить нам: +7 705 168 79 69.');
      return next('name', { guests: n }, 'Как вас зовут?');
    }
    case 'name': {
      if (text.length < 2 || text.length > 60) return again('Напишите, пожалуйста, имя (от 2 до 60 символов).');
      return next('phone', { name: text }, 'Телефон для связи? Например: +7 705 123 45 67.');
    }
    case 'phone': {
      const phone = normalizePhone(text);
      if (!phone) return again('Не похоже на номер телефона. Напишите, например: +7 705 123 45 67 или 8 705 123 45 67.');
      return next('comment', { phone }, 'Есть пожелания к брони (например, у окна, день рождения)? Если нет, напишите «-».');
    }
    case 'comment': {
      const comment = /^[-–—.]$|^нет$/i.test(text) ? '' : text.slice(0, 300);
      const full = { ...data, comment };
      return {
        state: { step: 'confirm', data: full },
        reply: `Проверьте заявку:\n\n${summary(full)}\n\nОтправить администратору?`,
        keyboard: CONFIRM_KEYBOARD,
      };
    }
    case 'confirm': {
      if (/^(да|отправ|подтвер|ок|верно)/i.test(text)) return { state: null, submit: data };
      if (/^(нет|отмен)/i.test(text)) return { state: null, reply: 'Хорошо, заявку отменили.', cancelled: true };
      return { state, reply: 'Нажмите «Отправить заявку» или «Отменить».', keyboard: CONFIRM_KEYBOARD };
    }
    default:
      return { state: null, reply: 'Что-то пошло не так, начнём сначала. Напишите «хочу забронировать».' };
  }
}

export function adminMessage(data, from, createdLabel) {
  const who = [from?.username ? `@${from.username}` : null, [from?.first_name, from?.last_name].filter(Boolean).join(' ') || null, from?.id ? `id ${from.id}` : null]
    .filter(Boolean)
    .join(', ');
  return `Новая заявка на бронь\n\n${summary(data)}\n\nTelegram: ${who || 'неизвестно'}\nПоступила: ${createdLabel}`;
}
