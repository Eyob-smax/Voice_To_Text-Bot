import { bot } from "./bot.js";

const WEBHOOK_URL = "https://voice-to-text-bot.vercel.app/";

const setWebhook = async () => {
  try {
    await bot.telegram.setWebhook(`${WEBHOOK_URL}`);
    console.log("✅ Webhook set successfully!");
  } catch (err) {
    console.error("❌ Failed to set webhook:", err);
  }
};

setWebhook();
