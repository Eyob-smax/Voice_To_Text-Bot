import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import dotenv from "dotenv";
import { transcribeAudioBuffer } from "./assembly.js";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set in environment variables.");
}

export const bot = new Telegraf(BOT_TOKEN);

const TEXT = {
  welcome: (firstName) =>
    `👋 Welcome, *${firstName || "there"}*! I'm your *Voice Transcriber Bot* 🗣️ 
Send/Forward me a voice message, music clip, or audio file — and I’ll convert it to text for you.`,

  help: `📘 *How to use this bot:*\n
1️⃣ Send me any *audio file* (voice note, music, or speech).\n
2️⃣ Wait a few seconds while I transcribe it ⏳\n
3️⃣ I’ll reply with the *text version* of your recording.`,

  about: `🤖 *About the Bot:*\n
This bot is a demonstration of converting various audio formats into text using a *Node.js* backend with the *Telegraf* framework. 
The actual speech-to-text processing is handled by an external service (AssemblyAI).\n
*Developer:* An AI Assistant\n
*Source:* Open-source (conceptual)`,

  processing: "🎧 Got your audio! Processing in memory...",
  unsupported:
    "❌ **Unsupported File Type.** Please send a valid audio message, voice note, or a document with an audio mime type.",
  noSpeech:
    "❌ **Transcription Failed.** I couldn’t detect clear speech in your recording or the audio quality was too low.",
  transcribed: (text) => `🗣️ *Transcribed Text:*\n\n${text}`,
  unknownError:
    "⚠️ **Unexpected Error.** Failed to process your audio message due to an internal server error. Please try again later.",
  apiError:
    "🚨 **Service Error.** The transcription service failed to process the request. The audio file might be corrupted or too long.",
};

const COMMANDS = [
  {
    command: "start",
    description: "Start the bot and see the welcome message",
  },
  { command: "help", description: "Show usage instructions" },
  { command: "about", description: "Information about the bot" },
];

bot.telegram.setMyCommands(COMMANDS).catch(console.error);

bot.start((ctx) => {
  ctx.reply(TEXT.welcome(ctx.from.first_name), {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("ℹ️ Help", "HELP")],
      [Markup.button.callback("📝 About", "ABOUT")],
    ]),
  });
});

bot.command("help", (ctx) => {
  ctx.reply(TEXT.help, { parse_mode: "Markdown" });
});

bot.command("about", (ctx) => {
  ctx.reply(TEXT.about, { parse_mode: "Markdown" });
});

bot.action("HELP", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(TEXT.help, { parse_mode: "Markdown" });
});

bot.action("ABOUT", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(TEXT.about, { parse_mode: "Markdown" });
});

bot.action("TRANSCRIBE_ANOTHER", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(TEXT.help, { parse_mode: "Markdown" });
});

bot.on(["voice", "audio", "video_note", "document"], async (ctx) => {
  let fileId;
  let sentMessage;

  try {
    const message = ctx.message;

    if (message.voice) fileId = message.voice.file_id;
    else if (message.audio) fileId = message.audio.file_id;
    else if (message.video_note) fileId = message.video_note.file_id;
    else if (
      message.document &&
      message.document.mime_type?.startsWith("audio/")
    )
      fileId = message.document.file_id;
    else {
      return ctx.reply(TEXT.unsupported, { parse_mode: "Markdown" });
    }

    sentMessage = await ctx.reply(TEXT.processing);

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const audioBuffer = Buffer.from(response.data);

    const text = await transcribeAudioBuffer(audioBuffer);

    if (!text || text.trim() === "") {
      return ctx.telegram.editMessageText(
        sentMessage.chat.id,
        sentMessage.message_id,
        null,
        TEXT.noSpeech,
        { parse_mode: "Markdown" }
      );
    }

    await ctx.telegram.editMessageText(
      sentMessage.chat.id,
      sentMessage.message_id,
      null,
      TEXT.transcribed(text),
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "🔁 Transcribe Another",
              "TRANSCRIBE_ANOTHER"
            ),
          ],
        ]),
      }
    );
  } catch (error) {
    let errorMessage = TEXT.unknownError;

    if (axios.isAxiosError(error) || error.message?.includes("Assembly")) {
      errorMessage = TEXT.apiError;
      console.error("External API/Download Error:", error.message);
    } else if (error.message?.includes("unsupported")) {
      errorMessage =
        "⚠️ *Download Error.* Failed to fetch the file from Telegram.";
      console.error("Telegram File Download Error:", error.message);
    } else {
      console.error("Voice handling error:", error);
    }

    if (sentMessage) {
      ctx.telegram.editMessageText(
        sentMessage.chat.id,
        sentMessage.message_id,
        null,
        errorMessage,
        { parse_mode: "Markdown" }
      );
    } else {
      ctx.reply(errorMessage, { parse_mode: "Markdown" });
    }
  }
});

bot.on("message", async (ctx) => {
  await ctx.reply(
    "🤖 I only understand *audio messages*! Please send a voice note or audio file 🎤",
    { parse_mode: "Markdown" }
  );
});

bot.catch((err, ctx) => {
  console.error(`Global error for ${ctx.updateType}:`, err);
  ctx.reply(TEXT.unknownError, { parse_mode: "Markdown" });
});
