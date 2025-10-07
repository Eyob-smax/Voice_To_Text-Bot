import { AssemblyAI } from "assemblyai";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import path from "path";

dotenv.config();
const client = new AssemblyAI({ apiKey: process.env.API_KEY });

/**
 * Transcribe an audio buffer without writing to disk permanently
 * @param {Buffer} audioBuffer
 * @returns {Promise<string>}
 */
export async function transcribeAudioBuffer(audioBuffer) {
  try {
    // Write to temporary file in OS temp folder
    const tempPath = path.join(os.tmpdir(), `temp_audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempPath, audioBuffer);

    const params = { audio: tempPath, speech_model: "universal" };
    const transcript = await client.transcripts.transcribe(params);

    // Clean up temporary file immediately
    fs.unlinkSync(tempPath);

    return transcript.text;
  } catch (error) {
    console.error("Transcription error:", error.message);
    throw new Error("Failed to transcribe audio.");
  }
}
