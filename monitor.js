require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");

const URL = process.env.MONITOR_URL;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

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

// Хранилище настроек для каждого пользователя
const userSettings = {};

function getUserSettings(chatId) {
  if (!userSettings[chatId]) {
    userSettings[chatId] = {
      minPrice: 100,
      maxPrice: 200,
      scammers: ["berek65"] // Список скамеров
    };
  }
  return userSettings[chatId];
}

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
        const chatId = update.message?.chat?.id;
        const text = update.message?.text;

        if (!text || String(chatId) !== String(CHAT_ID)) continue;

        // Команда /check
        if (text.startsWith('/check')) {
          console.log(`📩 Получена команда /check от ${chatId}`);
          await sendTelegram("⏳ Запускаю внеочередную проверку...");
          await checkPrices(chatId, true);
        }

        // Команда /setmin <цена>
        else if (text.startsWith('/setmin ')) {
          const price = parseFloat(text.replace('/setmin ', ''));
          if (isNaN(price) || price < 0) {
            await sendTelegram("❌ Неверный формат. Используй: /setmin 100");
          } else {
            const settings = getUserSettings(chatId);
            settings.minPrice = price;
            await sendTelegram(`✅ Минимальная цена установлена: ${price} ₽`);
            console.log(`⚙️ Пользователь ${chatId} установил MIN_PRICE = ${price}`);
          }
        }

        // Команда /setmax <цена>
        else if (text.startsWith('/setmax ')) {
          const price = parseFloat(text.replace('/setmax ', ''));
          if (isNaN(price) || price < 0) {
            await sendTelegram("❌ Неверный формат. Используй: /setmax 200");
          } else {
            const settings = getUserSettings(chatId);
            settings.maxPrice = price;
            await sendTelegram(`✅ Максимальная цена установлена: ${price} ₽`);
            console.log(`⚙️ Пользователь ${chatId} установил MAX_PRICE = ${price}`);
          }
        }

        // Команда /settings
        else if (text === '/settings') {
          const settings = getUserSettings(chatId);
          await sendTelegram(
            `⚙️ Текущие настройки:\n\n` +
            `💵 Диапазон цен: ${settings.minPrice}-${settings.maxPrice} ₽\n` +
            `🚫 Скамеров в списке: ${settings.scammers.length}\n\n` +
            `Команды:\n` +
            `/setmin <цена> - установить минимальную цену\n` +
            `/setmax <цена> - установить максимальную цену\n` +
            `/addscammer <ник> - добавить скамера\n` +
            `/removescammer <ник> - удалить из списка\n` +
            `/scammers - показать список скамеров\n` +
            `/check - внеочередная проверка`
          );
        }

        // Команда /addscammer <ник>
        else if (text.startsWith('/addscammer ')) {
          const nickname = text.replace('/addscammer ', '').trim();
          if (!nickname) {
            await sendTelegram("❌ Укажи ник. Используй: /addscammer berek65");
          } else {
            const settings = getUserSettings(chatId);
            if (settings.scammers.includes(nickname)) {
              await sendTelegram(`⚠️ ${nickname} уже в списке скамеров`);
            } else {
              settings.scammers.push(nickname);
              await sendTelegram(`✅ ${nickname} добавлен в список скамеров`);
              console.log(`🚫 Пользователь ${chatId} добавил скамера: ${nickname}`);
            }
          }
        }

        // Команда /removescammer <ник>
        else if (text.startsWith('/removescammer ')) {
          const nickname = text.replace('/removescammer ', '').trim();
          if (!nickname) {
            await sendTelegram("❌ Укажи ник. Используй: /removescammer berek65");
          } else {
            const settings = getUserSettings(chatId);
            const index = settings.scammers.indexOf(nickname);
            if (index === -1) {
              await sendTelegram(`⚠️ ${nickname} не найден в списке`);
            } else {
              settings.scammers.splice(index, 1);
              await sendTelegram(`✅ ${nickname} удален из списка скамеров`);
              console.log(`✓ Пользователь ${chatId} удалил скамера: ${nickname}`);
            }
          }
        }

        // Команда /scammers
        else if (text === '/scammers') {
          const settings = getUserSettings(chatId);
          if (settings.scammers.length === 0) {
            await sendTelegram("📋 Список скамеров пуст");
          } else {
            let message = `🚫 Список скамеров (${settings.scammers.length}):\n\n`;
            settings.scammers.forEach((nick, i) => {
              message += `${i + 1}. ${nick}\n`;
            });
            await sendTelegram(message);
          }
        }
      }
    }
  } catch (error) {
    // Игнорируем ошибки long polling
  }
}

async function checkPrices(chatId = CHAT_ID, sendResult = false) {
  const settings = getUserSettings(chatId);
  const { minPrice, maxPrice, scammers } = settings;

  console.log(`🔍 Проверка цен... ${new Date().toLocaleString("ru-RU")} (диапазон: ${minPrice}-${maxPrice}₽, скамеров: ${scammers.length})`);

  const { data } = await axios.get(URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  });

  // DEBUG: Сохраняем HTML в файл для проверки
  const fs = require("fs");
  fs.writeFileSync("debug.html", data);
  console.log(`📄 HTML сохранен в debug.html (${data.length} символов)`);

  const $ = cheerio.load(data);
  const offers = [];
  let scammerCount = 0;

  // Ищем все предложения
  console.log(`🔎 Поиск предложений...`);
  const items = $(".tc-item");
  console.log(`  Найдено элементов .tc-item: ${items.length}`);

  items.each((i, item) => {
    const $item = $(item);

    // Парсим цену
    const priceText = $item.find(".tc-price div").first().text().trim();
    const cleanPrice = priceText.replace(/\s/g, '');
    const priceMatch = cleanPrice.match(/(\d+(?:\.\d+)?)/);

    if (!priceMatch) return;

    const price = parseFloat(priceMatch[1]);

    // Парсим продавца (ищем span внутри .media-user-name)
    const seller = $item.find(".media-user-name span").text().trim() || "Неизвестно";

    // Проверяем, не в списке ли скамеров
    if (scammers.includes(seller)) {
      scammerCount++;
      console.log(`  [${i}] 🚫 СКИП (скамер): ${seller} - ${price}₽`);
      return; // Пропускаем это предложение
    }

    // Парсим ссылку
    const link = $item.attr("href") || "";
    const fullLink = link.startsWith("http") ? link : `https://funpay.com${link}`;

    offers.push({ price, seller, link: fullLink });
    console.log(`  [${i}] ${seller} - ${price}₽`);
  });

  console.log(`💰 Найдено предложений: ${offers.length} (отфильтровано скамеров: ${scammerCount})`);

  // Ищем предложения в диапазоне
  const inRange = offers.filter(o => o.price > minPrice && o.price < maxPrice);

  // Если есть предложения в диапазоне - отправляем их
  if (inRange.length > 0) {
    for (const offer of inRange) {
      await sendTelegram(
        `🔥 Найдено предложение!\n\n` +
        `💰 Цена: ${offer.price} ₽\n` +
        `👤 Продавец: ${offer.seller}\n` +
        `🔗 ${offer.link}`
      );
    }
    return true;
  }

  // Если это ручная проверка и нет предложений в диапазоне
  if (sendResult) {
    if (offers.length === 0) {
      await sendTelegram("❌ Предложения не найдены на странице");
    } else {
      // Показываем 3 самые низкие цены выше MAX_PRICE
      const aboveMax = offers
        .filter(o => o.price > maxPrice)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);

      let message = `✅ Проверка завершена\n\n` +
        `💰 Найдено предложений: ${offers.length}\n` +
        `⚠️ Подходящих (${minPrice}-${maxPrice}₽) не найдено\n`;

      if (aboveMax.length > 0) {
        message += `\n📊 3 самые низкие цены выше диапазона:\n\n`;
        aboveMax.forEach((offer, i) => {
          message += `${i + 1}. ${offer.price}₽ - ${offer.seller}\n${offer.link}\n\n`;
        });
      }

      await sendTelegram(message);
    }
  }

  return false;
}

(async () => {
  console.log("🚀 Запуск мониторинга...");
  console.log(`✅ URL: ${URL}`);
  console.log(`⏰ Интервал проверки: ${CHECK_INTERVAL / 60000} минут`);

  const defaultSettings = getUserSettings(CHAT_ID);
  console.log(`💵 Диапазон цен по умолчанию: ${defaultSettings.minPrice}-${defaultSettings.maxPrice} ₽`);
  console.log(`🚫 Скамеров в фильтре: ${defaultSettings.scammers.length}`);

  await sendTelegram(
    `🟢 Мониторинг запущен\n\n` +
    `⚙️ Настройки:\n` +
    `💵 Диапазон цен: ${defaultSettings.minPrice}-${defaultSettings.maxPrice} ₽\n` +
    `🚫 Скамеров в фильтре: ${defaultSettings.scammers.length}\n\n` +
    `Команды:\n` +
    `/settings - показать настройки\n` +
    `/setmin <цена> - установить минимальную цену\n` +
    `/setmax <цена> - установить максимальную цену\n` +
    `/addscammer <ник> - добавить скамера\n` +
    `/scammers - список скамеров\n` +
    `/check - внеочередная проверка`
  );

  // Первая проверка сразу
  try {
    await checkPrices(CHAT_ID);
  } catch (e) {
    console.error("❌ Ошибка при проверке:", e.message);
    await sendTelegram(`⚠️ Ошибка: ${e.message}`);
  }

  // Регулярные проверки
  setInterval(async () => {
    try {
      await checkPrices(CHAT_ID);
    } catch (e) {
      console.error("❌ Ошибка при проверке:", e.message);
      await sendTelegram(`⚠️ Ошибка: ${e.message}`);
    }
  }, CHECK_INTERVAL);

  // Проверка команд от пользователя каждые 3 секунды
  setInterval(async () => {
    await getUpdates();
  }, 3000);

  console.log("✅ Бот готов принимать команды");
})();
