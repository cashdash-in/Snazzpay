
'use server';
/**
 * @fileOverview An AI flow for parsing a WhatsApp chat export to extract product listings.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WhatsAppChatInputSchema = z.object({
  chatText: z.string().describe('The full text content of a WhatsApp chat export.'),
  startDate: z.string().optional().describe('The optional start date (ISO format) to filter chat messages.'),
  endDate: z.string().optional().describe('The optional end date (ISO format) to filter chat messages.'),
});

const SingleProductSchema = z.object({
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
      'The selling price of the product as found in the text. Extract the numeric value only.'
    ),
  sizes: z
    .array(z.string())
    .describe('An array of available sizes for the product (e.g., ["S", "M", "L", "XL"]).'),
  colors: z
    .array(z.string())
    .describe('An array of available colors for the product (e.g., ["Red", "Blue", "Green"]).'),
});

const WhatsAppChatOutputSchema = z.object({
  products: z.array(SingleProductSchema).describe('An array of all distinct products found in the chat text.'),
});

const parseChatPrompt = ai.definePrompt({
  name: 'parseWhatsAppChatPrompt',
  input: { schema: WhatsAppChatInputSchema },
  output: { schema: WhatsAppChatOutputSchema },
  prompt: `You are an expert e-commerce merchandiser specializing in parsing unstructured text from WhatsApp chats into structured product data.

Your task is to analyze the entire chat transcript provided in 'chatText'. Identify each distinct product being discussed and extract its details into a structured JSON object.

**IMPORTANT DATE FILTERING RULES:**
- {{#if startDate}}
  A start and end date have been provided. You MUST only consider messages that fall between **{{startDate}}** and **{{endDate}}**. Ignore all messages outside of this date range.
- {{else}}
  No date range has been provided. You MUST process all messages in the entire chat transcript.
- {{/if}}

For each product you find within the given timeframe, generate a complete product listing object with the following fields:
- **title:** Create a concise, catchy, and SEO-friendly title (under 60 characters).
- **description:** Write a compelling, well-formatted product description using Markdown. Start with an engaging sentence and use a bulleted list for features like material, quality, etc.
- **category:** Suggest a standard Shopify product category (e.g., "Apparel & Accessories > Clothing > Shirts & Tops").
- **price:** This is a critical field. Extract the selling price from the text. Look for patterns like "price 599", "Rs. 599", "599/-". If you absolutely cannot find a price for a specific product, set its price to 0.
- **sizes:** Extract all available sizes (e.g., S, M, L, XL) into an array of strings.
- **colors:** Extract all available colors into an array of strings.

Aggregate all the generated product objects into a single array under the 'products' key in the final output.

Chat Transcript:
---
{{{chatText}}}
---`,
});

const parseWhatsAppChatFlow = ai.defineFlow(
  {
    name: 'parseWhatsAppChatFlow',
    inputSchema: WhatsAppChatInputSchema,
    outputSchema: WhatsAppChatOutputSchema,
  },
  async (input) => {
    const { output } = await parseChatPrompt(input);
    if (!output || !output.products) {
      throw new Error('The AI failed to parse any products from the chat.');
    }
    return output;
  }
);

export async function parseWhatsAppChat(
  input: z.infer<typeof WhatsAppChatInputSchema>
): Promise<z.infer<typeof WhatsAppChatOutputSchema>> {
  return await parseWhatsAppChatFlow(input);
}
