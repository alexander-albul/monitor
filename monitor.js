require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");

const URL = process.env.MONITOR_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const MIN_PRICE = 100;
const MAX_PRICE = 200;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 минут

// Проверка переменных окружения
if (!BOT_TOKEN || !CHAT_ID || !URL) {
  console.error("❌ Не заданы обязательные переменные окружения:");
  if (!BOT_TOKEN) console.error("  - BOT_TOKEN");
  if (!CHAT_ID) console.error("  - CHAT_ID");
  if (!URL) console.error("  - MONITOR_URL");
  process.exit(1);
}

let lastUpdateId = 0;

async function sendTelegram(text) {
  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text
      }
    );
    console.log(`📤 Отправлено: ${text}`);
  } catch (error) {
    console.error("❌ Ошибка отправки в Telegram:", error.message);
  }
}

async function getUpdates() {
  try {
    const { data } = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
      {
        params: {
          offset: lastUpdateId + 1,
          timeout: 10
        }
      }
    );

    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        if (update.message?.text?.startsWith('/check')) {
          console.log(`📩 Получена команда /check от ${update.message.chat.id}`);

          if (String(update.message.chat.id) === String(CHAT_ID)) {
            await sendTelegram("⏳ Запускаю внеочередную проверку...");
            await checkPrices();
          }
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки long polling
  }
}

async function checkPrices() {
  console.log(`🔍 Проверка цен... ${new Date().toLocaleString("ru-RU")}`);
  
  const { data } = await axios.get(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  const $ = cheerio.load(data);
  const prices = [];

  $("body").text().split(/\s+/).forEach(word => {
    const match = word.match(/(\d+)\s*₽/);
    if (match) {
      prices.push(Number(match[1]));
    }
  });

  console.log(`💰 Найдено цен: ${prices.length}`);

  for (const price of prices) {
    if (price > MIN_PRICE && price < MAX_PRICE) {
      await sendTelegram(
        `🔥 Найдено предложение!\n` +
        `Цена: ${price} ₽\n` +
        `${URL}`
      );
      return;
    }
  }
}

(async () => {
  console.log("🚀 Запуск мониторинга...");
  console.log(`✅ URL: ${URL}`);
  console.log(`⏰ Интервал проверки: ${CHECK_INTERVAL / 60000} минут`);
  console.log(`💵 Диапазон цен: ${MIN_PRICE}-${MAX_PRICE} ₽`);

  await sendTelegram("🟢 Мониторинг запущен");

  // Первая проверка сразу
  try {
    await checkPrices();
  } catch (e) {
    console.error("❌ Ошибка при проверке:", e.message);
    await sendTelegram(`⚠️ Ошибка: ${e.message}`);
  }

  // Регулярные проверки
  setInterval(async () => {
    try {
      await checkPrices();
    } catch (e) {
      console.error("❌ Ошибка при проверке:", e.message);
      await sendTelegram(`⚠️ Ошибка: ${e.message}`);
    }
  }, CHECK_INTERVAL);

  // Проверка команд от пользователя каждые 3 секунды
  setInterval(async () => {
    await getUpdates();
  }, 3000);

  console.log("✅ Бот готов принимать команды. Отправь /check для внеочередной проверки");
})();
