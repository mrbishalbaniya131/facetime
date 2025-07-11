'use server';

/**
 * @fileOverview This file defines a Genkit flow for comparing detected face descriptors with registered users
 * and marking attendance if a match is found.
 *
 * - compareDetectedFaces - A function that compares detected faces with registered users and marks attendance.
 * - CompareDetectedFacesInput - The input type for the compareDetectedFaces function.
 * - CompareDetectedFacesOutput - The return type for the compareDetectedFaces function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareDetectedFacesInputSchema = z.object({
  detectedFaceDescriptor: z.array(z.number()).describe('The descriptor of the detected face.'),
  registeredUserDescriptors: z.array(z.object({
    userId: z.string().describe('The ID of the registered user.'),
    descriptor: z.array(z.number()).describe('The face descriptor of the registered user.'),
  })).describe('An array of registered user IDs and their face descriptors.'),
});
export type CompareDetectedFacesInput = z.infer<typeof CompareDetectedFacesInputSchema>;

const CompareDetectedFacesOutputSchema = z.object({
  userId: z.string().optional().describe('The ID of the matched user, if any.'),
  matchConfidence: z.number().optional().describe('The confidence of the face match (0-1), if any.'),
});
export type CompareDetectedFacesOutput = z.infer<typeof CompareDetectedFacesOutputSchema>;

export async function compareDetectedFaces(input: CompareDetectedFacesInput): Promise<CompareDetectedFacesOutput> {
  return compareDetectedFacesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'compareDetectedFacesPrompt',
  input: {schema: CompareDetectedFacesInputSchema},
  output: {schema: CompareDetectedFacesOutputSchema},
  prompt: `You are an expert facial recognition system.

You are given a detected face descriptor and a list of registered user descriptors.
Your task is to compare the detected face descriptor against the registered user descriptors and find the best match.

Return the userId of the best match and the matchConfidence (a number between 0 and 1 representing the confidence of the match).
If no match is found, return an empty object.

Detected Face Descriptor: {{{detectedFaceDescriptor}}}
Registered User Descriptors: {{{registeredUserDescriptors}}}

Output format: { userId: string, matchConfidence: number } or {} if no match is found.
`,
});

const compareDetectedFacesFlow = ai.defineFlow(
  {
    name: 'compareDetectedFacesFlow',
    inputSchema: CompareDetectedFacesInputSchema,
    outputSchema: CompareDetectedFacesOutputSchema,
  },
  async input => {
    // Simple cosine similarity implementation for face comparison
    function cosineSimilarity(descriptor1: number[], descriptor2: number[]): number {
      if (descriptor1.length !== descriptor2.length) {
        return 0;
      }

      let dotProduct = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;

      for (let i = 0; i < descriptor1.length; i++) {
        dotProduct += descriptor1[i] * descriptor2[i];
        magnitude1 += descriptor1[i] * descriptor1[i];
        magnitude2 += descriptor2[i] * descriptor2[i];
      }

      magnitude1 = Math.sqrt(magnitude1);
      magnitude2 = Math.sqrt(magnitude2);

      if (magnitude1 === 0 || magnitude2 === 0) {
        return 0;
      }

      return dotProduct / (magnitude1 * magnitude2);
    }

    let bestMatch: { userId: string; matchConfidence: number } = { userId: '', matchConfidence: 0 };

    for (const registeredUser of input.registeredUserDescriptors) {
      const similarity = cosineSimilarity(input.detectedFaceDescriptor, registeredUser.descriptor);

      if (similarity > bestMatch.matchConfidence) {\n        bestMatch = { userId: registeredUser.userId, matchConfidence: similarity };
      }
    }

    if (bestMatch.matchConfidence > 0.6) { // Adjust threshold as needed
      return { userId: bestMatch.userId, matchConfidence: bestMatch.matchConfidence };
    } else {
      return {};
    }

    // const {output} = await prompt(input);
    // return output!;
  }
);
