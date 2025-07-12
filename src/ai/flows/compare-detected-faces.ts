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
  registeredUserDescriptors: z.array(z.object({
    userId: z.string().describe('The ID of the registered user.'),
    descriptor: z.array(z.number()).describe('The face descriptor of the registered user.'),
  })).describe('An array of registered user IDs and their face descriptors.'),
  isLocationAuthorized: z.boolean().nullable().describe('Whether the user is in an authorized location for attendance.'),
  expressions: z.object({}).catchall(z.number()).describe("A map of detected facial expressions and their confidence scores (0-1)."),
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

export async function analyzePerson(input: AnalyzePersonInput): Promise<AnalyzePersonOutput> {
  return analyzePersonFlow(input);
}

const prompt = ai.definePrompt({
    name: 'analyzePersonPrompt',
    input: {schema: AnalyzePersonInputSchema},
    output: {schema: z.object({ activityDescription: AnalyzePersonOutputSchema.shape.activityDescription }) },
    prompt: `You are a security AI. Analyze the person in the image and provide a concise description of their activity. Do not greet or use conversational filler.

Image: {{media url=imageDataUri}}
`,
});


const analyzePersonFlow = ai.defineFlow(
  {
    name: 'analyzePersonFlow',
    inputSchema: AnalyzePersonInputSchema,
    outputSchema: AnalyzePersonOutputSchema,
  },
  async input => {
    // Face comparison logic
    function cosineSimilarity(descriptor1: number[], descriptor2: number[]): number {
      if (descriptor1.length !== descriptor2.length || descriptor1.length === 0) { return 0; }
      let dotProduct = 0; let magnitude1 = 0; let magnitude2 = 0;
      for (let i = 0; i < descriptor1.length; i++) {
        dotProduct += descriptor1[i] * descriptor2[i];
        magnitude1 += descriptor1[i] * descriptor1[i];
        magnitude2 += descriptor2[i] * descriptor2[i];
      }
      magnitude1 = Math.sqrt(magnitude1); magnitude2 = Math.sqrt(magnitude2);
      if (magnitude1 === 0 || magnitude2 === 0) { return 0; }
      return dotProduct / (magnitude1 * magnitude2);
    }
    
    let thought = `Analyzing detected face. Comparing against ${input.registeredUserDescriptors.length} registered user(s).`;
    if (input.isLocationAuthorized === true) {
        thought += `\nLocation: Verified from authorized location.`;
    } else if (input.isLocationAuthorized === false) {
        thought += `\nLocation: Outside authorized area. Attendance will be unverified.`;
    } else {
        thought += `\nLocation: Status unknown.`;
    }
    
    let bestMatch: { userId: string; matchConfidence: number } = { userId: '', matchConfidence: 0 };

    for (const registeredUser of input.registeredUserDescriptors) {
      const similarity = cosineSimilarity(input.detectedFaceDescriptor, registeredUser.descriptor);
      if (similarity > bestMatch.matchConfidence) {
        bestMatch = { userId: registeredUser.userId, matchConfidence: similarity };
      }
    }
    
    const getDominantExpression = (expressions: Record<string, number>): string | undefined => {
        if (!expressions || Object.keys(expressions).length === 0) return undefined;
        let dominantExpression = 'neutral';
        let maxConfidence = 0.5; // Start with a neutral threshold
        for (const [expression, confidence] of Object.entries(expressions)) {
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                dominantExpression = expression;
            }
        }
        return dominantExpression;
    };
    const mood = getDominantExpression(input.expressions);
    
    // Call the LLM to get the activity description
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
            // Non-fatal, continue without audio
        }
    }
    
    const MATCH_THRESHOLD = 0.5;
    if (bestMatch.matchConfidence > MATCH_THRESHOLD) {
        const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
        thought += `\nFound best match: ${bestMatch.userId} with ${confidencePercent}% confidence. Match exceeds threshold of ${MATCH_THRESHOLD * 100}%.`;
        return { userId: bestMatch.userId, matchConfidence: bestMatch.matchConfidence, thought, activityDescription, audioSrc, mood };
    } else {
        if(bestMatch.userId && bestMatch.matchConfidence > 0) {
            const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
            thought += `\nBest match is ${bestMatch.userId} with ${confidencePercent}% confidence, but it's below the ${MATCH_THRESHOLD * 100}% threshold. No match declared.`;
        } else {
            thought += `\nNo potential matches found.`;
        }
        return { thought, activityDescription, audioSrc, mood };
    }
  }
);
