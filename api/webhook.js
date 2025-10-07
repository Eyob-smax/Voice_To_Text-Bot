import { bot } from "../bot.js";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
      return res.status(200).send("OK");
    } else if (req.method === "GET") {
      return res.status(200).send("Bot is live!");
    }
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).send("Something went wrong");
  }
}
