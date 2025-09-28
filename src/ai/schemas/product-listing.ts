/**
 * @fileOverview Zod schemas and TypeScript types for the product listing AI flow.
 * These are shared between the client-side uploader and the server-side flow.
 */
import { z } from 'zod';

export const ProductListingInputSchema = z.object({
  imageDataUris: z
    .array(z.string())
    .describe(
      "A list of photos of the product, each as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z
    .string()
    .describe('The raw description of the product from the vendor.'),
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
  sizes: z
    .array(z.string())
    .describe('An array of available sizes for the product (e.g., ["S", "M", "L", "XL"]).'),
  colors: z
    .array(z.string())
    .describe('An array of available colors for the product (e.g., ["Red", "Blue", "Green"]).'),
});
export type ProductListingOutput = z.infer<typeof ProductListingOutputSchema>;
