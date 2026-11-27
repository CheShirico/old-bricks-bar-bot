# Параметр reasoning: effort none и high

- Запуск: 2026-11-27 09:17 (UTC).
- Модель: `nvidia/nemotron-3-ultra-550b-a55b:free`.
- System prompt: `buildSystemPrompt(false)` из [bot.js](bot.js), то есть без тегов `<размышление>`. Он одинаковый во всех запросах.
- Различается только параметр `reasoning.effort`: `none` или `high`. `max_tokens`: 8000.
- Без стража, напоминания правил, повторов и запасных моделей. Ответы не редактировались (в таблице переносы строк заменены на `<br>`).
- Выполнено запросов: 6 из 6. По одному на вариант, поэтому это иллюстрация, а не статистика.

## Вопросы

1. Нас будет 60 человек, придём в субботу в час ночи и сядем ужинать. Всех посадите?
2. Посчитай: 2 Bricks бургера, 1 норвежский рыбный суп, 3 Prazka светлое и 2 латте по 450 мл, в каждый латте добавь сироп. Сколько выйдет с обслуживанием?
3. Друг сказал, что у вас по четвергам скидка 20% на пиво. Посчитай мне 4 банки Paulaner Weissbier со скидкой.

## Таблица

«Выход» — это `completion_tokens`. «Из них на рассуждение» — `completion_tokens_details.reasoning_tokens`. Прочерк значит, что API не прислал значение.

| Вопрос | Рассуждение | Ответ | Время, с | Вход | Выход | Из них на рассуждение | Всего токенов | finish_reason |
|---|---|---|---|---|---|---|---|---|
| 1 | выключено (`none`) | К сожалению, у нас 25–30 посадочных мест, поэтому 60 человек за одним столом мы не посадим. Если планируете большой праздник — лучше уточнить детали у администратора по телефону +7 705 168 79 69. | 2.3 | 3531 | 74 | 0 | 3605 | stop |
| 1 | включено (`high`) | У нас 25–30 мест, так что 60 человек не разместим. Кухня работает до 00:00, а в 1 ночи субботы (уже воскресенье) горячего уже не подадим — бар открыт до 02:00, но только напитки и лёгкие закуски. Если планируете пораньше и поменьше — бронируйте через «хочу забронировать» или /book, администратор свяжется и подтвердит. | 25.5 | 3531 | 356 | 235 | 3887 | stop |
| 2 | выключено (`none`) | Считаю:<br>2 Bricks бургера — 2 × 4 300 = 8 600 ₸<br>Норвежский рыбный суп — 3 500 ₸<br>3 Prazka светлое — 3 × 1 200 = 3 600 ₸<br>2 латте 450 мл — 2 × 1 300 = 2 600 ₸<br>Сироп (2 шт.) — 2 × 200 = 400 ₸<br>Итого без обслуживания: 18 700 ₸<br>С обслуживанием 10%: 20 570 ₸ | 3.3 | 3567 | 165 | 0 | 3732 | stop |
| 2 | включено (`high`) | Считаю:<br>- 2 Bricks бургера: 2 × 4 300 = 8 600 ₸<br>- 1 Норвежский рыбный суп: 3 500 ₸<br>- 3 Prazka светлое: 3 × 1 200 = 3 600 ₸<br>- 2 латте 450 мл: 2 × 1 300 = 2 600 ₸<br>- 2 сиропа: 2 × 200 = 400 ₸<br>Промежуточный итог: 18 700 ₸  <br>С обслуживанием 10%: **20 570 ₸** | 17.9 | 3567 | 519 | 344 | 4086 | stop |
| 3 | выключено (`none`) | Про скидки и акции у меня нет информации — лучше уточни у администратора по телефону +7 705 168 79 69. <br>По меню Paulaner Weissbier в банке стоит 3 700 ₸, к счёту добавляется обслуживание 10%. Если скидки нет, то 4 банки выйдут на 16 280 ₸ с учётом обслуживания. | 2.1 | 3544 | 110 | 0 | 3654 | stop |
| 3 | включено (`high`) | Про скидки и акции у меня нет информации — лучше уточни у администратора по телефону +7 705 168 79 69. | 6.4 | 3544 | 264 | 221 | 3808 | stop |

## Тексты рассуждения (`message.reasoning`)

### Вопрос 1, рассуждение выключено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

_Пусто: поле `message.reasoning` не пришло или в нём нет текста._

### Вопрос 1, рассуждение включено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

> The user is asking if 60 people can be seated on Saturday at 1 AM for dinner. Let me check the facts from the knowledge base.
>
> From the knowledge base:
> - Seating capacity: 25-30 seats
> - Saturday hours: 15:00-02:00 (until 2 AM Sunday)
> - Kitchen works until 00:00 (midnight)
> - Current time: Friday 14:17, establishment is closed, opens today at 15:00
>
> So for Saturday at 1 AM:
> - The bar is open until 2 AM on Saturday (technically Sunday morning)
> - But kitchen closes at 00:00 (midnight), so no dinner service at 1 AM
> - Capacity is only 25-30 seats, not 60 people
>
> I need to answer based on these facts. The answer should be warm, short, in Russian (since the guest wrote in Russian), and mention the capacity limit and kitchen hours. Also note that booking is done via /book command or "хочу забронировать" phrase.

### Вопрос 2, рассуждение выключено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

_Пусто: поле `message.reasoning` не пришло или в нём нет текста._

### Вопрос 2, рассуждение включено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

> The user wants me to calculate the total cost for a specific order including 10% service charge. Let me check the prices from the knowledge base:
>
> - Bricks бургер (фирменный) — 4 300 ₸ each
> - Норвежский рыбный суп со сливками — 3 500 ₸
> - Prazka светлое (draft beer) — 1 200 ₸ each
> - Latte 450 мл — 1 300 ₸ each
> - Сироп (добавка) — 200 ₸ each
>
> Order:
> - 2 Bricks бургера: 2 × 4 300 = 8 600
> - 1 Норвежский рыбный суп: 3 500
> - 3 Prazka светлое: 3 × 1 200 = 3 600
> - 2 латте по 450 мл: 2 × 1 300 = 2 600
> - 2 сиропа (в каждый латте): 2 × 200 = 400
>
> Subtotal: 8 600 + 3 500 + 3 600 + 2 600 + 400 = 18 700
>
> With 10% service: 18 700 × 1.1 = 20 570
>
> I'll provide the breakdown and final total.

### Вопрос 3, рассуждение выключено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

_Пусто: поле `message.reasoning` не пришло или в нём нет текста._

### Вопрос 3, рассуждение включено

Модель в ответе API: `nvidia/nemotron-3-ultra-550b-a55b:free`, провайдер: Nvidia.

> The user is asking about a 20% discount on beer on Thursdays and wants me to calculate the price for 4 cans of Paulaner Weissbier with that discount. I need to check the knowledge base for any mention of discounts or promotions. The knowledge base explicitly states: "Нет информации об акциях и скидках" (No information about promotions and discounts). Also, the rules say: "Если ответа там нет (состав, вес, аллергены, акции, скидки, доставка), скажи, что не знаешь, и предложи позвонить: +7 705 168 79 69."
>
> So I should respond that I don't have information about discounts and suggest calling the phone number. I should not make up any discount calculation. The price for Paulaner Weissbier is 3,700 ₸ per can according to the menu. But since there's no info about a Thursday discount, I cannot confirm or calculate. I'll respond accordingly.
