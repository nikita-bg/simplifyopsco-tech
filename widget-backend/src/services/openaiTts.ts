import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

// Sentence boundary detector — splits text into TTS-ready chunks
function splitIntoSentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [];
  const remainder = text.replace(/[^.!?]+[.!?]+[\s]*/g, '').trim();
  if (remainder) sentences.push(remainder);
  return sentences.filter(s => s.trim().length > 0);
}

export type TtsVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

/**
 * Convert a text string to base64-encoded MP3 audio via OpenAI TTS.
 * Returns null if text is empty or TTS is unavailable.
 */
export async function textToSpeechBase64(
  text: string,
  voice: TtsVoice = 'nova',
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!config.openaiApiKey) return null;

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: trimmed,
    response_format: 'mp3',
  });

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export interface TtsChunk {
  text: string;
  audioBase64: string | null;
}

/**
 * Takes a stream of text deltas from Gemini, buffers them into sentences,
 * and yields { text, audioBase64 } pairs.
 *
 * Usage: for await (const chunk of streamTts(textGenerator, voice)) { ... }
 */
export async function* streamTts(
  textDeltas: AsyncGenerator<string>,
  voice: TtsVoice = 'nova',
): AsyncGenerator<TtsChunk> {
  let buffer = '';

  for await (const delta of textDeltas) {
    buffer += delta;

    // Check if buffer contains complete sentences
    const sentences = splitIntoSentences(buffer);
    if (sentences.length > 1) {
      // All but last are complete sentences — the last might be incomplete
      const complete = sentences.slice(0, -1);
      const remaining = sentences[sentences.length - 1];

      for (const sentence of complete) {
        const audioBase64 = await textToSpeechBase64(sentence, voice);
        yield { text: sentence, audioBase64 };
      }

      // Keep potentially incomplete sentence in buffer
      buffer = remaining;
    }
  }

  // Flush remaining buffer
  if (buffer.trim()) {
    const audioBase64 = await textToSpeechBase64(buffer.trim(), voice);
    yield { text: buffer.trim(), audioBase64 };
  }
}
