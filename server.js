import express from "express";
import { bot } from "./bot.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Voice Transcriber Bot is running.");
});

bot.launch();
console.log("🤖 Voice Transcriber Bot is running...");
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
