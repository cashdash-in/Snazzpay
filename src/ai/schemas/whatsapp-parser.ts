/**
 * @fileOverview Zod schemas and TypeScript types for the WhatsApp parser AI flow.
 */
import { z } from 'zod';
import { ProductListingOutputSchema } from './product-listing';

export const WhatsAppParserInputSchema = z.object({
  chatText: z
    .string()
    .describe('The full text content of an exported WhatsApp chat.'),
  startDate: z
    .string()
    .optional()
    .describe('An optional ISO 8601 start date to filter messages.'),
  endDate: z
    .string()
    .optional()
    .describe('An optional ISO 8601 end date to filter messages.'),
});
export type WhatsAppParserInput = z.infer<typeof WhatsAppParserInputSchema>;

export const WhatsAppParserOutputSchema = z.object({
  products: z
    .array(ProductListingOutputSchema)
    .describe(
      'An array of product listings found within the provided chat text.'
    ),
});
export type WhatsAppParserOutput = z.infer<typeof WhatsAppParserOutputSchema>;
