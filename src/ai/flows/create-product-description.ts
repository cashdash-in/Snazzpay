'use server';
/**
 * @fileOverview A simple AI flow to generate a product title and description
 * from an image. This is useful for bulk uploads where only an image is provided.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ProductDescriptionInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ProductDescriptionInput = z.infer<
  typeof ProductDescriptionInputSchema
>;

const ProductDescriptionOutputSchema = z.object({
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
    .describe('A suitable product category from the Shopify Product Taxonomy.'),
});
export type ProductDescriptionOutput = z.infer<
  typeof ProductDescriptionOutputSchema
>;


const prompt = ai.definePrompt({
  name: 'productDescriptionPrompt',
  input: { schema: ProductDescriptionInputSchema },
  output: { schema: ProductDescriptionOutputSchema },
  prompt: `You are an expert e-commerce merchandiser. Your task is to analyze the provided product image and generate a compelling title, description, and category.

      Image: {{media url=imageDataUri}}`,
});

const createProductDescriptionFlow = ai.defineFlow(
  {
    name: 'createProductDescriptionFlow',
    inputSchema: ProductDescriptionInputSchema,
    outputSchema: ProductDescriptionOutputSchema,
  },
  async (input) => {

    // Robust error handling for the AI call.
    try {
      const { output } = await prompt(input);
      return output!;
    } catch (error) {
      console.error("AI flow failed:", error);
      // Return a user-friendly error response instead of crashing.
      return {
        title: "AI Generation Failed",
        description: `The AI service could not be reached. This is often due to an invalid or missing GEMINI_API_KEY in your production environment. Please verify your API key and permissions. The original error was: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: "error",
      };
    }
  }
);

export async function createProductDescription(
  input: ProductDescriptionInput
): Promise<ProductDescriptionOutput> {
  return createProductDescriptionFlow(input);
}
