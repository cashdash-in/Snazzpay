'use server';
/**
 * @fileOverview An AI flow for creating a full product listing from images and raw text.
 */
import { ai } from '@/ai/genkit';
import {
  ProductListingInputSchema,
  ProductListingOutputSchema,
  ProductListingInput,
  ProductListingOutput,
} from '@/ai/schemas/product-listing';

export async function createProductListing(
  input: ProductListingInput
): Promise<ProductListingOutput> {
  return createProductListingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productListingPrompt',
  input: { schema: ProductListingInputSchema },
  output: { schema: ProductListingOutputSchema },
  prompt: `You are an expert e-commerce merchandiser. Your task is to take the provided product images, a raw text description, a base cost, and a desired profit margin, and generate a complete, professional product listing.

      - The title should be catchy and SEO-friendly.
      - The description should be well-structured, using Markdown for formatting.
      - Identify available sizes and colors from the text and images.
      - Calculate the final selling price by applying the margin to the cost.

      Images:
      {{#each imageDataUris}}
      {{media url=this}}
      {{/each}}

      Raw Description: {{{description}}}
      Base Cost: {{{cost}}}
      Profit Margin: {{{margin}}}%
      `,
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
