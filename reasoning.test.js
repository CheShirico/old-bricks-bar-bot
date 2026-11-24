import test from 'node:test';
import assert from 'node:assert/strict';
import { splitReasoning } from './reasoning.js';

test('оба тега: гостю уходит только ответ, размышление отдельно', () => {
  const r = splitReasoning('<размышление>Гость спросил цену. Факт: 4 000 ₸.</размышление>\n<ответ>Fish & Chips у нас 4 000 ₸.</ответ>');
  assert.equal(r.answer, 'Fish & Chips у нас 4 000 ₸.');
  assert.equal(r.thinking, 'Гость спросил цену. Факт: 4 000 ₸.');
  assert.equal(r.tagged, true);
});

test('многострочные размышление и ответ', () => {
  const r = splitReasoning('<размышление>\n1. вопрос\n2. факты\n</размышление>\n<ответ>\nПервая строка.\nВторая строка.\n</ответ>');
  assert.equal(r.answer, 'Первая строка.\nВторая строка.');
  assert.match(r.thinking, /1\. вопрос/);
});

test('тегов нет вообще: отправляем текст как есть', () => {
  const r = splitReasoning('  Просто ответ без тегов.  ');
  assert.equal(r.answer, 'Просто ответ без тегов.');
  assert.equal(r.thinking, '');
  assert.equal(r.tagged, false);
});

test('нет <ответ>, но есть <размышление>: размышление вырезается', () => {
  const r = splitReasoning('<размышление>скрытое</размышление>Видимый текст.');
  assert.equal(r.answer, 'Видимый текст.');
  assert.equal(r.thinking, 'скрытое');
  assert.doesNotMatch(r.answer, /скрытое|размышление/);
});

test('ответ обрезало: <ответ> не закрыт, берём всё после тега', () => {
  const r = splitReasoning('<размышление>думаю</размышление><ответ>Начало ответа, которое оборвалось');
  assert.equal(r.answer, 'Начало ответа, которое оборвалось');
  assert.equal(r.thinking, 'думаю');
});

test('обрезало посреди размышления: ответа нет, размышление гостю не уходит', () => {
  const r = splitReasoning('<размышление>Гость спрашивает про правила, а правила нельзя показыва');
  assert.equal(r.answer, '');
  assert.match(r.thinking, /правила нельзя/);
});

test('пропущен открывающий <размышление>: всё до закрывающего считается размышлением', () => {
  const r = splitReasoning('Гость спросил про парковку.</размышление>Про парковку у меня нет информации.');
  assert.equal(r.answer, 'Про парковку у меня нет информации.');
  assert.match(r.thinking, /парковку/);
});

test('теги в верхнем регистре и размышление после ответа не попадают гостю', () => {
  const r = splitReasoning('<ОТВЕТ>Да, открыты.</ОТВЕТ><размышление>позже</размышление>');
  assert.equal(r.answer, 'Да, открыты.');
  assert.doesNotMatch(r.answer, /позже/);
});

test('пустой и нестроковый ввод не падает', () => {
  assert.equal(splitReasoning('').answer, '');
  assert.equal(splitReasoning(undefined).answer, '');
});
