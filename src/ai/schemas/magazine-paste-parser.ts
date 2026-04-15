'use server';
/**
 * @fileOverview Zod schemas for the magazine page magic paste parser.
 */
import { z } from 'zod';

export const MagazinePasteInputSchema = z.object({
  chatText: z.string().describe('The unstructured chat text to parse for products.'),
});
export type MagazinePasteInput = z.infer<typeof MagazinePasteInputSchema>;

const SimplifiedProductSchema = z.object({
    title: z.string().describe("The product title."),
    description: z.string().describe("A detailed product description."),
    price: z.number().describe("The product price as a number."),
});

export const MagazinePasteOutputSchema = z.object({
  products: z
    .array(SimplifiedProductSchema)
    .describe(
      'An array of simplified product listings found within the provided chat text.'
    ),
});
export type MagazinePasteOutput = z.infer<typeof MagazinePasteOutputSchema>;
