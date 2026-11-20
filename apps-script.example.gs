// Google Apps Script: принимает заявки на бронь от Telegram-бота и добавляет их строкой в таблицу.
// Как подключить: Google Таблица -> Расширения -> Apps Script -> вставить этот код -> Развернуть ->
// Новое развёртывание -> Тип: Веб-приложение -> Выполнять от имени: Я -> Доступ: Все -> Развернуть.
// Скопированный адрес веб-приложения (https://script.google.com/macros/s/.../exec) вставить в .env как SHEET_WEBHOOK_URL.

const SECRET = '__SECRET__'; // замените на длинную случайную строку; та же строка должна быть в SHEET_SECRET в .env
const SHEET_NAME = 'Заявки';
const HEADERS = ['Создана', 'Дата брони', 'Время', 'Гостей', 'Имя', 'Телефон', 'Комментарий', 'Telegram', 'Chat ID', 'Статус'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) return reply_({ ok: false, error: 'forbidden' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const r = body.row;
    const values = [r.created, r.date, r.time, r.guests, r.name, r.phone, r.comment, r.telegram, String(r.chatId), 'Новая'];
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length);
    range.setNumberFormat('@'); // всё как текст: чтобы телефон +7... и время не превратились в числа или даты
    range.setValues([values]);
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
