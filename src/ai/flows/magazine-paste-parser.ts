'use server';
/**
 * @fileOverview An AI flow to parse unstructured chat text for the smart magazine.
 */
import { ai } from '@/ai/genkit';
import {
  MagazinePasteInputSchema,
  MagazinePasteOutputSchema,
  type MagazinePasteInput,
  type MagazinePasteOutput,
} from '@/ai/schemas/magazine-paste-parser';

export async function parseTextForMagazine(
  input: MagazinePasteInput
): Promise<MagazinePasteOutput> {
  return magazinePasteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'magazinePastePrompt',
  model: 'googleai/gemini-pro',
  input: { schema: MagazinePasteInputSchema },
  output: {
    schema: MagazinePasteOutputSchema,
    format: 'json',
  },
  config: {
    response_mime_type: 'application/json',
  },
  prompt: `You are an expert in parsing unstructured text to find product information. Analyze the following chat text. Identify each distinct product being discussed and extract its details. For each product, provide a title, a detailed description, and a price.

      Chat Content:
      ---
      {{{chatText}}}
      ---
    `,
});

const magazinePasteFlow = ai.defineFlow(
  {
    name: 'magazinePasteFlow',
    inputSchema: MagazinePasteInputSchema,
    outputSchema: MagazinePasteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
