'use server';
/**
 * @fileOverview An AI flow for parsing a WhatsApp chat export to extract product listings.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WhatsAppChatInputSchema = z.object({
  chatText: z.string().describe('The full text content of a WhatsApp chat export.'),
  cost: z.number().describe('The base cost of the products.'),
  margin: z.number().describe('The desired profit margin percentage.'),
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
      'The calculated selling price based on the cost and profit margin.'
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

For each product you find, generate a complete product listing object with the following fields:
- **title:** Create a concise, catchy, and SEO-friendly title (under 60 characters).
- **description:** Write a compelling, well-formatted product description using Markdown. Start with an engaging sentence and use a bulleted list for features.
- **category:** Suggest a standard Shopify product category (e.g., "Apparel & Accessories > Clothing > Shirts & Tops").
- **price:** Calculate the final selling price using the formula: cost * (1 + (margin / 100)). Round the final price to a logical number (e.g., 499 instead of 498.75).
- **sizes:** Extract all available sizes into an array of strings.
- **colors:** Extract all available colors into an array of strings.

Aggregate all the generated product objects into a single array under the 'products' key in the final output.

Base Cost: {{{cost}}}
Desired Margin: {{{margin}}}%

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
