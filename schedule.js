// График работы The Old Bricks Bar и работа со временем Алматы.

// Часы работы по дням недели (0 = воскресенье): [открытие, закрытие] в часах.
// Закрытие > 24 означает переход за полночь (суббота работает до 02:00 воскресенья).
export const HOURS = { 0: [15, 24], 1: null, 2: null, 3: null, 4: [15, 24], 5: [15, 24], 6: [15, 26] };
export const DAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

// Текущая дата и время в Алматы (UTC+5): календарная дата, день недели, минуты от полуночи.
export function almatyNow(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Almaty',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    weekday: WEEKDAYS_EN.indexOf(p.weekday),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

// Готовим факт «открыто ли сейчас» кодом, а не доверяем модели считать время с переходом через полночь.
export function workStatus(date = new Date()) {
  const n = almatyNow(date);
  const day = n.weekday;
  const minutes = n.minutes;
  const now = `${DAYS_RU[day]}, ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

  const today = HOURS[day];
  const yesterday = HOURS[(day + 6) % 7];
  const closeLabel = (h) => `${pad(h % 24)}:00`;

  if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
    return `Сейчас ${now} (время Алматы). Заведение ОТКРЫТО, сегодня работает до ${closeLabel(today[1])}.`;
  }
  if (yesterday && yesterday[1] > 24 && minutes < (yesterday[1] - 24) * 60) {
    return `Сейчас ${now} (время Алматы). Заведение ОТКРЫТО (вчерашняя смена), закроется в ${closeLabel(yesterday[1])}.`;
  }
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const h = HOURS[d];
    if (h && (i > 0 || minutes < h[0] * 60)) {
      const when = i === 0 ? `сегодня (${DAYS_RU[d]})` : i === 1 ? `завтра (${DAYS_RU[d]})` : DAYS_RU[d];
      return `Сейчас ${now} (время Алматы). Заведение ЗАКРЫТО. Ближайшее открытие: ${when} в ${pad(h[0])}:00.`;
    }
  }
  return `Сейчас ${now} (время Алматы).`;
}
