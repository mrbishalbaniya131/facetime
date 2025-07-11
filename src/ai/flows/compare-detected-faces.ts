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
  thought: z.string().describe('The thought process of the AI.'),
});
export type CompareDetectedFacesOutput = z.infer<typeof CompareDetectedFacesOutputSchema>;

export async function compareDetectedFaces(input: CompareDetectedFacesInput): Promise<CompareDetectedFacesOutput> {
  return compareDetectedFacesFlow(input);
}

const compareDetectedFacesFlow = ai.defineFlow(
  {
    name: 'compareDetectedFacesFlow',
    inputSchema: CompareDetectedFacesInputSchema,
    outputSchema: CompareDetectedFacesOutputSchema,
  },
  async input => {
    // Simple cosine similarity implementation for face comparison
    function cosineSimilarity(descriptor1: number[], descriptor2: number[]): number {
      if (descriptor1.length !== descriptor2.length || descriptor1.length === 0) {
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
    
    let thought = `Analyzing detected face. Comparing against ${input.registeredUserDescriptors.length} registered user(s).`;
    let bestMatch: { userId: string; matchConfidence: number } = { userId: '', matchConfidence: 0 };

    for (const registeredUser of input.registeredUserDescriptors) {
      const similarity = cosineSimilarity(input.detectedFaceDescriptor, registeredUser.descriptor);
      if (similarity > bestMatch.matchConfidence) {
        bestMatch = { userId: registeredUser.userId, matchConfidence: similarity };
      }
    }
    
    const MATCH_THRESHOLD = 0.5; // Confidence threshold
    if (bestMatch.matchConfidence > MATCH_THRESHOLD) {
        const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
        thought += `\nFound best match: ${bestMatch.userId} with ${confidencePercent}% confidence. Match exceeds threshold of ${MATCH_THRESHOLD * 100}%.`;
        return { userId: bestMatch.userId, matchConfidence: bestMatch.matchConfidence, thought };
    } else {
        if(bestMatch.userId) {
            const confidencePercent = (bestMatch.matchConfidence * 100).toFixed(1);
            thought += `\nBest match is ${bestMatch.userId} with ${confidencePercent}% confidence, but it's below the ${MATCH_THRESHOLD * 100}% threshold. No match declared.`;
        } else {
            thought += `\nNo potential matches found.`;
        }
        return { thought };
    }
  }
);

    