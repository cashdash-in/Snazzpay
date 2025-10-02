
'use server';
/**
 * @fileOverview An AI flow for generating a product title and description from raw text.
 *
 * - createProductFromText - A function that handles the generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProductTextSchema = z.object({
  text: z.string().describe('The raw text from a WhatsApp chat or other source describing a product.'),
});

const ProductTextOutputSchema = z.object({
  title: z.string().describe('A concise, catchy title for the product based on the text.'),
  description: z.string().describe('A well-formatted, detailed product description based on the text. Include features like sizes, colors, and material if mentioned.'),
});

export async function createProductFromText(
  input: z.infer<typeof ProductTextSchema>
): Promise<z.infer<typeof ProductTextOutputSchema>> {
  return await createProductFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createProductFromTextPrompt',
  input: { schema: ProductTextSchema },
  output: { schema: ProductTextOutputSchema },
  prompt: `You are an expert e-commerce copywriter. Your task is to extract product information from a raw text paste and generate a clean title and description.

  Analyze the provided text.

  - **Title:** Create a concise and appealing title for the product.
  - **Description:** Write a clear and well-structured description. If the text mentions features like sizes, colors, material, or other details, format them into a bulleted list for readability.

  Here is the raw text:
  {{{text}}}
  `,
});

const createProductFromTextFlow = ai.defineFlow(
  {
    name: 'createProductFromTextFlow',
    inputSchema: ProductTextSchema,
    outputSchema: ProductTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to process the text.');
    }
    return output;
  }
);
