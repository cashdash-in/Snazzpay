'use server';
/**
 * @fileOverview An AI flow to parse a WhatsApp chat export and extract multiple product listings.
 */

import { ai } from '@/ai/genkit';
import { ProductListingOutputSchema } from '@/ai/schemas/product-listing';
import { z } from 'zod';

export const WhatsAppParserInputSchema = z.object({
  chatText: z
    .string()
    .describe('The full text content of an exported WhatsApp chat.'),
  startDate: z.string().optional().describe('An optional ISO 8601 start date to filter messages.'),
  endDate: z.string().optional().describe('An optional ISO 8601 end date to filter messages.'),
});

export const WhatsAppParserOutputSchema = z.object({
  products: z
    .array(ProductListingOutputSchema)
    .describe(
      'An array of product listings found within the provided chat text.'
    ),
});

export async function parseWhatsAppChat(
  input: z.infer<typeof WhatsAppParserInputSchema>
): Promise<z.infer<typeof WhatsAppParserOutputSchema>> {
  const prompt = ai.definePrompt({
    name: 'whatsAppParserPrompt',
    input: { schema: WhatsAppParserInputSchema },
    output: { schema: WhatsAppParserOutputSchema },
    prompt: `You are an expert in parsing unstructured text to find product information. Analyze the following WhatsApp chat export. Identify each distinct product being discussed and extract its details.

      - A new product usually starts with a product name/code or an image.
      - Consolidate all messages related to a single product into one entry.
      - Extract the title, a detailed description, price, available sizes, and colors for each product.
      - If a date range is provided, only consider messages within that range.

      Date Range: {{#if startDate}}{{startDate}} to {{endDate}}{{else}}Not specified{{/if}}

      Chat Content:
      '''
      {{{chatText}}}
      '''
    `,
  });
  const { output } = await prompt(input);
  return output!;
}
