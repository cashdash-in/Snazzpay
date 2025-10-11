'use server';
/**
 * @fileOverview An AI flow that takes unstructured text (like from a WhatsApp message)
 * and extracts a structured product title and description.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const ProductFromTextInputSchema = z.object({
  text: z.string().describe('The unstructured text containing product details.'),
});
export type ProductFromTextInput = z.infer<typeof ProductFromTextInputSchema>;

export const ProductFromTextOutputSchema = z.object({
  title: z.string().describe('A short, catchy title for the product.'),
  description: z
    .string()
    .describe(
      'A clean, well-formatted product description based on the provided text.'
    ),
});
export type ProductFromTextOutput = z.infer<typeof ProductFromTextOutputSchema>;

export async function createProductFromText(
  input: ProductFromTextInput
): Promise<ProductFromTextOutput> {
  return createProductFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createProductFromTextPrompt',
  input: { schema: ProductFromTextInputSchema },
  output: { schema: ProductFromTextOutputSchema },
  prompt: `You are a text-parsing expert. Analyze the following text, which might be messy and from a chat message. Extract a clean product title and a well-structured description.

    Input Text:
    '''
    {{{text}}}
    '''
    `,
});

const createProductFromTextFlow = ai.defineFlow(
  {
    name: 'createProductFromTextFlow',
    inputSchema: ProductFromTextInputSchema,
    outputSchema: ProductFromTextOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
