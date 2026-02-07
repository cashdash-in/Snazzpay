'use server';
/**
 * @fileOverview An AI flow that takes unstructured text (like from a WhatsApp message)
 * and extracts a structured product title and description.
 */

import { ai } from '@/ai/genkit';
import {
  ProductFromTextInputSchema,
  ProductFromTextOutputSchema,
  type ProductFromTextInput,
  type ProductFromTextOutput,
} from '@/ai/schemas/product-from-text';

export async function createProductFromText(
  input: ProductFromTextInput
): Promise<ProductFromTextOutput> {
  return createProductFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createProductFromTextPrompt',
  model: 'googleai/gemini-pro',
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
  async (input: ProductFromTextInput) => {
    const { output } = await prompt(input);
    return output!;
  }
);
