'use server';

/**
 * @fileOverview This file defines a Genkit flow for converting text to speech.
 *
 * - textToSpeech - A function that takes a string and returns a base64 encoded WAV audio file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';

type TextToSpeechInput = string;
type TextToSpeechOutput = { audio: string };


async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}


export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  const textToSpeechFlow = ai.defineFlow(
      {
          name: 'textToSpeechFlow',
          inputSchema: z.string(),
          outputSchema: z.object({
              audio: z.string().describe("Base64 encoded WAV audio string."),
          }),
      },
      async (query) => {
          const { media } = await ai.generate({
              model: googleAI.model('gemini-2.5-flash-preview-tts'),
              config: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                      voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Algenib' },
                      },
                  },
              },
              prompt: query,
          });

          if (!media || !media.url) {
              throw new Error('No audio media returned from TTS model.');
          }

          const audioBuffer = Buffer.from(
              media.url.substring(media.url.indexOf(',') + 1),
              'base64'
          );
          
          const wavBase64 = await toWav(audioBuffer);

          return {
              audio: 'data:audio/wav;base64,' + wavBase64,
          };
      }
  );
  
  return textToSpeechFlow(input);
}
