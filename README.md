# FunPay Monitor

Telegram-бот для мониторинга цен на FunPay.

## Что делает

- Проверяет https://funpay.com/lots/3734/ каждые 5 минут
- Ищет цены от 100 до 200 ₽
- Отправляет уведомления в Telegram

## Деплой на Render

1. Форкни этот репозиторий
2. Зайди на [render.com](https://render.com)
3. Создай новый **Background Worker**
4. Подключи свой GitHub-репозиторий
5. Настрой:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Добавь Environment Variables:
   - `BOT_TOKEN` — токен твоего Telegram бота (получи у [@BotFather](https://t.me/botfather))
   - `CHAT_ID` — твой chat ID (получи у [@userinfobot](https://t.me/userinfobot))

## Локальный запуск

```bash
npm install
export BOT_TOKEN="твой_токен"
export CHAT_ID="твой_chat_id"
npm start
```

## Настройка

В `monitor.js` можешь изменить:

- `URL` — ссылка на FunPay
- `MIN_PRICE` и `MAX_PRICE` — диапазон цен
- `CHECK_INTERVAL` — интервал проверки (в миллисекундах)
