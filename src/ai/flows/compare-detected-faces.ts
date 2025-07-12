'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing a person in an image.
 * It compares detected face descriptors with registered users and describes the person's activity.
 *
 * - analyzePerson - A function that recognizes a person and describes their activity.
 * - AnalyzePersonInput - The input type for the analyzePerson function.
 * - AnalyzePersonOutput - The return type for the analyzePerson function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { textToSpeech } from './text-to-speech';

const AnalyzePersonInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A snapshot from the webcam, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  detectedFaceDescriptor: z.array(z.number()).describe('The descriptor of the detected face.'),
  isLocationAuthorized: z.boolean().nullable().describe('Whether the user is in an authorized location for attendance.'),
});
export type AnalyzePersonInput = z.infer<typeof AnalyzePersonInputSchema>;

const AnalyzePersonOutputSchema = z.object({
  userId: z.string().optional().describe('The ID of the matched user, if any.'),
  matchConfidence: z.number().optional().describe('The confidence of the face match (0-1), if any.'),
  activityDescription: z.string().optional().describe("A description of the person's activity in the image."),
  thought: z.string().describe('The thought process of the AI.'),
  audioSrc: z.string().optional().describe('Base64 encoded WAV audio of the activity description.'),
  mood: z.string().optional().describe('The dominant mood detected from facial expressions.'),
});
export type AnalyzePersonOutput = z.infer<typeof AnalyzePersonOutputSchema>;

export async function analyzePerson(input: Omit<AnalyzePersonInput, 'registeredUserDescriptors'>): Promise<Omit<AnalyzePersonOutput, 'userId' | 'matchConfidence'>> {
  // This function is now designed to be called only for UNKNOWN faces.
  // The face matching logic is handled client-side for immediate feedback.
  // This flow's purpose is to describe the activity of an unknown person.
  
  const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to get a response from the AI model.");
    }
  const { activityDescription } = output;
  let audioSrc: string | undefined = undefined;
    if (activityDescription) {
        try {
            const ttsResult = await textToSpeech(activityDescription);
            audioSrc = ttsResult.audio;
        } catch (ttsError) {
            console.error("Error in TTS generation during analysis:", ttsError);
        }
    }

  return {
    thought: "Analyzed unknown person's activity.",
    activityDescription,
    audioSrc
  };
}

const prompt = ai.definePrompt({
    name: 'analyzePersonPrompt',
    input: {schema: AnalyzePersonInputSchema},
    output: {schema: z.object({ activityDescription: AnalyzePersonOutputSchema.shape.activityDescription }) },
    prompt: `You are a security AI. Analyze the person in the image. Provide a detailed description of their activity, including their body position and posture. Be concise but descriptive. Do not greet or use conversational filler.

Image: {{media url=imageDataUri}}
`,
});
