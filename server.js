import express from "express";
import { bot } from "./bot.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 9000;

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
