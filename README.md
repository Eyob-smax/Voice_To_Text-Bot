# 🎙️ Voice Transcriber Bot

**Voice Transcriber Bot** is a Telegram bot that automatically converts voice messages into text — built using **Telegraf**, **Express**, and **AssemblyAI (or any speech-to-text API)**.  
I created this bot after a funny real-life moment: while I was in class and couldn’t listen to a friend’s voice message, I decided to build a bot that could do it for me 😄  

> 🚫 *Currently supports only English (no Amharic yet) — but still super useful when you can’t play voice messages!*

---

## 💡 Inspiration / Why I Built It

One day, while I was in class, a friend sent me a voice message on WhatsApp — but I couldn’t listen to it at the time.  
A few minutes later, the same friend sent another voice message on Telegram. I replied, “I’m in class, I can’t listen to this right now 😭😭.”  

Then she said, “Why don’t you just build a bot that turns voice messages into text?”  
That idea clicked instantly 😅 — so after class (and a quick lunch break), I started coding, and within a few hours, **boom 💥**, this bot was born.  

This project was made purely **for fun and learning**, but it turned out to be really useful for anyone who can’t listen to voice messages — whether you’re in class, a meeting, or just somewhere quiet.

---

## 🧠 Features
- 🎧 Converts voice messages to text  
- ⚡ Fast and reliable transcription  
- 🧩 Deployed on **Vercel** using **webhooks**  
- 🧠 Built with **Node.js + Telegraf + Express**  
- 🔒 Keeps temporary audio data in memory (not saved on disk)  

---

## 🏗️ Tech Stack
| Tool | Purpose |
|------|----------|
| **Node.js** | Backend runtime |
| **Telegraf** | Telegram Bot framework |
| **Express** | API routing for Vercel |
| **AssemblyAI / OpenAI Whisper API** | Audio transcription |
| **Vercel** | Deployment and webhook hosting |

---

## 🚀 Setup & Installation

### 1️⃣ Clone the repo
```bash
git clone https://github.com/Eyob-smax/Voice_To_Text-Bot.git
cd voice-transcriber-bot
