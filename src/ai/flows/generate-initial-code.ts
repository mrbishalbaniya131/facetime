'use server';

/**
 * @fileOverview A Genkit flow for generating initial code for the WebcamCapture component.
 *
 * - generateInitialCode - A function that generates the initial code for the WebcamCapture component.
 * - GenerateInitialCodeInput - The input type for the generateInitialCode function.
 * - GenerateInitialCodeOutput - The return type for the generateInitialCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialCodeInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate the initial code for the WebcamCapture component.'),
});
export type GenerateInitialCodeInput = z.infer<typeof GenerateInitialCodeInputSchema>;

const GenerateInitialCodeOutputSchema = z.object({
  code: z.string().describe('The generated initial code for the WebcamCapture component.'),
});
export type GenerateInitialCodeOutput = z.infer<typeof GenerateInitialCodeOutputSchema>;

export async function generateInitialCode(input: GenerateInitialCodeInput): Promise<GenerateInitialCodeOutput> {
  return generateInitialCodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInitialCodePrompt',
  input: {schema: GenerateInitialCodeInputSchema},
  output: {schema: GenerateInitialCodeOutputSchema},
  prompt: `You are an expert React developer.

  You will generate the initial code for the WebcamCapture component based on the following prompt:

  {{prompt}}
  `,
});

const generateInitialCodeFlow = ai.defineFlow(
  {
    name: 'generateInitialCodeFlow',
    inputSchema: GenerateInitialCodeInputSchema,
    outputSchema: GenerateInitialCodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
