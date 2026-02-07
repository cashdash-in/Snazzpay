/**
 * @fileOverview Zod schemas and TypeScript types for the product from text AI flow.
 */
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
