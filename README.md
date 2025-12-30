# FunPay Monitor

Telegram-бот для мониторинга цен на FunPay.

## Что делает

- Проверяет указанный URL на FunPay каждые 5 минут
- Ищет цены в заданном диапазоне
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
   - `FUNPAY_URL` — ссылка на страницу FunPay которую нужно мониторить (например: `https://funpay.com/lots/3734/`)

## Локальный запуск

```bash
npm install
export BOT_TOKEN="твой_токен"
export CHAT_ID="твой_chat_id"
export FUNPAY_URL="https://funpay.com/lots/YOUR_LOT_ID/"
npm start
```

Или создай файл `.env`:
```
BOT_TOKEN=твой_токен
CHAT_ID=твой_chat_id
FUNPAY_URL=https://funpay.com/lots/YOUR_LOT_ID/
```

## Настройка

В `monitor.js` можешь изменить:

- `MIN_PRICE` и `MAX_PRICE` — диапазон цен (по умолчанию: 100-200 ₽)
- `CHECK_INTERVAL` — интервал проверки в миллисекундах (по умолчанию: 5 минут)
