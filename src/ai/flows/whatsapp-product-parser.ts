'use server';
/**
 * @fileOverview An AI flow to parse a WhatsApp chat export and extract multiple product listings.
 */

import { ai } from '@/ai/genkit';
import {
  WhatsAppParserInputSchema,
  WhatsAppParserOutputSchema,
  type WhatsAppParserInput,
  type WhatsAppParserOutput,
} from '@/ai/schemas/whatsapp-parser';

export async function parseWhatsAppChat(
  input: WhatsAppParserInput
): Promise<WhatsAppParserOutput> {
  return parseWhatsAppChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'whatsAppParserPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: WhatsAppParserInputSchema },
  output: {
    schema: WhatsAppParserOutputSchema,
    format: 'json',
  },
  prompt: `You are an expert in parsing unstructured text to find product information. Analyze the following WhatsApp chat export. Identify each distinct product being discussed and extract its details.

      - A new product usually starts with a product name/code or an image.
      - Consolidate all messages related to a single product into one entry.
      - Extract the title, a detailed description, price, available sizes, and colors for each product.
      - If a date range is provided, only consider messages within that range.

      Date Range: {{#if startDate}}{{startDate}} to {{endDate}}{{else}}Not specified{{/if}}

      Chat Content:
      ---
      {{{chatText}}}
      ---
    `,
});

const parseWhatsAppChatFlow = ai.defineFlow(
  {
    name: 'parseWhatsAppChatFlow',
    inputSchema: WhatsAppParserInputSchema,
    outputSchema: WhatsAppParserOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
