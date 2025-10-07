
'use server';
/**
 * @fileOverview An AI flow for generating a compelling product description.
 *
 * - createProductDescription - A function that handles the description generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProductDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the product.'),
  imageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProductDescriptionInput = z.infer<typeof ProductDescriptionInputSchema>;


const ProductDescriptionOutputSchema = z.object({
  description: z.string().describe('A compelling, marketing-friendly product description. Use bullet points for features if appropriate.'),
});
export type ProductDescriptionOutput = z.infer<typeof ProductDescriptionOutputSchema>;


const prompt = ai.definePrompt({
  name: 'createProductDescriptionPrompt',
  input: { schema: ProductDescriptionInputSchema },
  output: { schema: ProductDescriptionOutputSchema },
  prompt: `You are an expert e-commerce copywriter. Your task is to write a compelling, customer-facing product description.

  Analyze the provided title and image to understand the product.

  - Write a short, engaging description that highlights the key features and benefits.
  - Use a friendly and persuasive tone.
  - Format the description for readability, using bullet points for features where it makes sense.

  Here is the product information:
  - **Product Title:** {{{title}}}
  - **Product Image:**
    {{media url=imageDataUri}}
  `,
});

const createProductDescriptionFlow = ai.defineFlow(
  {
    name: 'createProductDescriptionFlow',
    inputSchema: ProductDescriptionInputSchema,
    outputSchema: ProductDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a description.');
    }
    return output;
  }
);


export async function createProductDescription(
  input: ProductDescriptionInput
): Promise<ProductDescriptionOutput> {
  return await createProductDescriptionFlow(input);
}
