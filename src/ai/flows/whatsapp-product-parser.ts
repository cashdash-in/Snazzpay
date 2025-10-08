
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

Your task is to analyze the entire chat transcript provided in 'chatText'. The chat contains discussions about multiple products. Identify each distinct product and extract its details.
{{#if startDate}}
Only consider messages between {{startDate}} and {{endDate}}. Ignore all messages outside this date range.
{{/if}}

For each product you find, generate a complete product listing object with the following fields:
- **title:** Create a concise, catchy, and SEO-friendly title (under 60 characters).
- **description:** Write a compelling, well-formatted product description using Markdown. Start with an engaging sentence and use a bulleted list for features.
- **category:** Suggest a standard Shopify product category (e.g., "Apparel & Accessories > Clothing > Shirts & Tops").
- **price:** Extract the selling price from the text. This is a critical field. If a price is mentioned (e.g., "price 599", "Rs. 599", "599/-"), extract that numeric value. If no price is found for a product, set it to 0.
- **sizes:** Extract all available sizes into an array of strings.
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
