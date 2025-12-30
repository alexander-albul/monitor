# Price Monitor

Telegram-бот для мониторинга цен на сайтах.

## Что делает

- Проверяет указанный URL каждые 5 минут
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
   - `MONITOR_URL` — ссылка на страницу которую нужно мониторить

## Локальный запуск

```bash
npm install
export BOT_TOKEN="твой_токен"
export CHAT_ID="твой_chat_id"
export MONITOR_URL="https://example.com/page/"
npm start
```

Или создай файл `.env`:
```
BOT_TOKEN=твой_токен
CHAT_ID=твой_chat_id
MONITOR_URL=https://example.com/page/
```

## Настройка

В `monitor.js` можешь изменить:

- `MIN_PRICE` и `MAX_PRICE` — диапазон цен (по умолчанию: 100-200 ₽)
- `CHECK_INTERVAL` — интервал проверки в миллисекундах (по умолчанию: 5 минут)
