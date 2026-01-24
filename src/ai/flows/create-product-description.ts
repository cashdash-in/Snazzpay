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

const ProductDescriptionOutputSchema = z.object({
  title: z
    .string()
    .describe('A catchy, SEO-friendly title for the product. Max 60 characters.'),
  description: z
    .string()
    .describe(
      'A compelling, well-structured product description. Use Markdown for formatting (e.g., bullet points for features).'
    ),
  category: z.string().describe('A suitable product category from the Shopify Product Taxonomy.'),
});

export async function createProductDescription(
  input: z.infer<typeof ProductDescriptionInputSchema>
): Promise<z.infer<typeof ProductDescriptionOutputSchema>> {
  const prompt = ai.definePrompt({
    name: 'productDescriptionPrompt',
    input: { schema: ProductDescriptionInputSchema },
    output: { schema: ProductDescriptionOutputSchema },
    prompt: `You are an expert e-commerce merchandiser. Your task is to analyze the provided product image and generate a compelling title, description, and category.

      Image: {{media url="imageDataUri"}}`,
  });

  const { output } = await prompt(input);
  return output!;
}
