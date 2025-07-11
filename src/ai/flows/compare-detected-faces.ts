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
import {z} from 'genkit';

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
});
export type AnalyzePersonInput = z.infer<typeof AnalyzePersonInputSchema>;

const AnalyzePersonOutputSchema = z.object({
  userId: z.string().optional().describe('The ID of the matched user, if any.'),
  matchConfidence: z.number().optional().describe('The confidence of the face match (0-1), if any.'),
  activityDescription: z.string().describe("A description of the person's activity in the image."),
  thought: z.string().describe('The thought process of the AI.'),
});
export type AnalyzePersonOutput = z.infer<typeof AnalyzePersonOutputSchema>;

export async function analyzePerson(input: AnalyzePersonInput): Promise<AnalyzePersonOutput> {
  return analyzePersonFlow(input);
}

const prompt = ai.definePrompt({
    name: 'analyzePersonPrompt',
    input: {schema: AnalyzePersonInputSchema},
    output: {schema: AnalyzePersonOutputSchema},
    prompt: `You are a security AI. Your task is to analyze an image of a person.
1.  First, describe the person's apparent activity based on the image. For example: "The person is smiling and looking at the camera." or "The person appears to be talking on the phone."
2.  Next, you will be given a face descriptor for the face detected in the image and a list of known face descriptors for registered users.
3.  Your job is to determine if the detected face matches any of the registered users.
4.  Do not perform the comparison yourself. You will be provided with the result of a separate comparison process.
5.  Formulate a "thought" process based on the comparison result provided in the input, explaining the match decision.

Use the following as the source of information.

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
    // Face comparison logic remains the same
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
    let bestMatch: { userId: string; matchConfidence: number } = { userId: '', matchConfidence: 0 };

    for (const registeredUser of input.registeredUserDescriptors) {
      const similarity = cosineSimilarity(input.detectedFaceDescriptor, registeredUser.descriptor);
      if (similarity > bestMatch.matchConfidence) {
        bestMatch = { userId: registeredUser.userId, matchConfidence: similarity };
      }
    }

    // Now, call the LLM to get the activity description and consolidate the thought process
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("Failed to get a response from the AI model.");
    }
    const { activityDescription } = output;
    
    const MATCH_THRESHOLD = 0.5;
    if (bestMatch.matchConfidence > MATCH_THRESHOLD) {
        const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
        thought += `\nFound best match: ${bestMatch.userId} with ${confidencePercent}% confidence. Match exceeds threshold of ${MATCH_THRESHOLD * 100}%.`;
        return { userId: bestMatch.userId, matchConfidence: bestMatch.matchConfidence, thought, activityDescription };
    } else {
        if(bestMatch.userId && bestMatch.matchConfidence > 0) {
            const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
            thought += `\nBest match is ${bestMatch.userId} with ${confidencePercent}% confidence, but it's below the ${MATCH_THRESHOLD * 100}% threshold. No match declared.`;
        } else {
            thought += `\nNo potential matches found.`;
        }
        return { thought, activityDescription };
    }
  }
);
