import { Telegraf, Markup } from "telegraf";
import axios from "axios";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { transcribeAudioBuffer } from "./assembly.js";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not set in environment variables.");
}

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_RECIPIENT = process.env.EMAIL_RECIPIENT;

let transporter = null;
if (EMAIL_USER && EMAIL_PASS && EMAIL_RECIPIENT) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn(
    "⚠️ Email alert variables (EMAIL_USER, EMAIL_PASS, EMAIL_RECIPIENT) are not fully configured. Email alerts are disabled."
  );
}

async function sendErrorEmail(subject, body) {
  if (!transporter) return;

  const mailOptions = {
    from: `NestJS Bot Monitor <${EMAIL_USER}>`,
    to: EMAIL_RECIPIENT,
    subject: `[BOT ERROR] ${subject}`,
    html: `<p><strong>Time:</strong> ${new Date().toISOString()}</p><hr><p>${body.replace(
      /\n/g,
      "<br>"
    )}</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email alert sent: ${subject}`);
  } catch (mailError) {
    console.error("❌ Failed to send email alert:", mailError);
  }
}

export const bot = new Telegraf(BOT_TOKEN);

const TEXT = {
  welcome: (firstName) =>
    `👋 Welcome, *${firstName || "there"}*! I'm your *Voice Transcriber Bot* 🗣️ 
**Forward** me a voice message, music clip, or audio file — and I’ll convert it to text for you.\n
💬 I share more stuff like this on my channel — TechVibe! [Join here](https://t.me/devwitheyob)`,

  help: `📘 *How to use this bot:*\n
1️⃣ Forward me any *audio file* (voice note, music, or speech).\n
2️⃣ Wait a few seconds while I transcribe it ⏳\n
3️⃣ I’ll reply with the *text version* of your recording.`,

  about: `🤖 *About the Bot:*\n
Can't listen to that voice message right now? 🤫\n
Use me! Forward it to me any audio (voice notes, music clips, or files), and I'll instantly convert the sound into **readable text**. 📝\n
I make sure you never miss a word, even in a noisy or quiet place. 🚀\n
*Developer:* Developed by [Eyob S.](https://t.me/devwitheyob) \n
*Version:* 1.1`,

  processing: "🎧 Got your audio! Processing, wait a moment...",
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
      await sendErrorEmail(
        "Unsupported File Type Received",
        `User: ${ctx.from.id} (${ctx.from.first_name}) sent an unsupported file type.`
      );
      return ctx.reply(TEXT.unsupported, { parse_mode: "Markdown" });
    }

    sentMessage = await ctx.reply(TEXT.processing);

    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const audioBuffer = Buffer.from(response.data);

    const text = await transcribeAudioBuffer(audioBuffer);

    if (!text || text.trim() === "") {
      await sendErrorEmail(
        "Transcription Failed - No Speech Detected",
        `User: ${ctx.from.id} (${ctx.from.first_name}) had a transcription failure with no detectable speech.`
      );
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
    let emailSubject = "Unknown Error in Audio Handler";
    let emailBody = `Error: ${error.message}\nStack: ${error.stack}\nUser: ${ctx.from.id} (${ctx.from.first_name})`;

    if (axios.isAxiosError(error) || error.message?.includes("Assembly")) {
      errorMessage = TEXT.apiError;
      emailSubject = "Transcription Service/Download Failure";
    } else if (error.message?.includes("unsupported")) {
      errorMessage =
        "⚠️ *Download Error.* Failed to fetch the file from Telegram.";
      emailSubject = `${
        ctx.from.first_name || "Unknown User"
      }  Telegram File Download Failure`;
    } else {
      emailSubject = "Critical Bot Error";
      emailBody = `Critical error in bot:\nError: ${error.message}\nStack: ${error.stack}\nUser: ${ctx.from.id} (${ctx.from.first_name})`;
      await sendErrorEmail(emailSubject, emailBody);
      return ctx.reply("🛑 Message too long to process", {
        parse_mode: "Markdown",
      });
    }

    await sendErrorEmail(emailSubject, emailBody);

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

bot.catch(async (err, ctx) => {
  const emailSubject = `GLOBAL CRITICAL ERROR: ${ctx.updateType} update`;
  const emailBody = `Error: ${err.message}\nStack: ${err.stack}\nUpdate Type: ${
    ctx.updateType
  }\nUser: ${ctx.from?.id || "N/A"}`;

  console.error(`Global error for ${ctx.updateType}:`, err);

  await sendErrorEmail(emailSubject, emailBody);

  ctx.reply(TEXT.unknownError, { parse_mode: "Markdown" });
});
