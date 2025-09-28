'use server';
/**
 * @fileOverview An AI flow for generating a product listing from an image and text.
 *
 * - createProductListing - A function that handles the product listing generation.
 * - ProductListingInput - The input type for the createProductListing function.
 * - ProductListingOutput - The return type for the createProductListing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const ProductListingInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The raw description of the product from the vendor.'),
  cost: z.number().describe('The base cost of the product.'),
  margin: z.number().describe('The desired profit margin percentage.'),
});
export type ProductListingInput = z.infer<typeof ProductListingInputSchema>;

export const ProductListingOutputSchema = z.object({
  title: z
    .string()
    .describe('A catchy, SEO-friendly title for the product. Max 60 characters.'),
  description: z
    .string()
    .describe(
      'A compelling, well-structured product description. Use Markdown for formatting (e.g., bullet points for features).'
    ),
  category: z
    .string()
    .describe(
      'A suitable category for the product (e.g., "Apparel > Mens > Shirts").'
    ),
  price: z
    .number()
    .describe(
      'The calculated selling price based on the cost and profit margin.'
    ),
});
export type ProductListingOutput = z.infer<typeof ProductListingOutputSchema>;

export async function createProductListing(
  input: ProductListingInput
): Promise<ProductListingOutput> {
  return createProductListingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createProductListingPrompt',
  input: { schema: ProductListingInputSchema },
  output: { schema: ProductListingOutputSchema },
  prompt: `You are an expert e-commerce merchandiser. Your task is to take a raw product description, an image, a cost price, and a profit margin to generate a market-ready product listing for a Shopify store.

  Analyze the provided image and the raw text description to understand the product.

  - **Title:** Create a concise, catchy, and SEO-friendly title. It should be under 60 characters.
  - **Description:** Write a compelling product description. It should be well-formatted using Markdown. Start with a captivating sentence, followed by a bulleted list of key features and benefits.
  - **Category:** Suggest a standard Shopify product category (e.g., "Apparel & Accessories > Clothing > Shirts & Tops").
  - **Price:** Calculate the final selling price. The formula is: cost * (1 + (margin / 100)). Round the final price to the nearest logical number (e.g., 499 instead of 498.75).

  Here is the raw information:
  - **Cost Price:** {{{cost}}}
  - **Desired Margin:** {{{margin}}}%
  - **Raw Description:** {{{description}}}
  - **Product Image:** {{media url=imageDataUri}}`,
});

const createProductListingFlow = ai.defineFlow(
  {
    name: 'createProductListingFlow',
    inputSchema: ProductListingInputSchema,
    outputSchema: ProductListingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
