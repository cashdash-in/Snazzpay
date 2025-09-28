'use server';
/**
 * @fileOverview An AI flow for generating a product listing from an image and text.
 *
 * - createProductListing - A function that handles the product listing generation.
 */

import { ai } from '@/ai/genkit';
import {
  ProductListingInput,
  ProductListingInputSchema,
  ProductListingOutput,
  ProductListingOutputSchema,
} from '@/ai/schemas/product-listing';

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
  - **Sizes & Colors:** Extract all available sizes and colors from the description and return them as arrays of strings.

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
