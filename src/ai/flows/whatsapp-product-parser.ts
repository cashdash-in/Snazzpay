
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
      'The selling price of the product as found in the text. Extract the numeric value only. If no price is found, set it to 0.'
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
  prompt: `You are an expert e-commerce merchandiser. Analyze the entire chat transcript in 'chatText' and extract each distinct product into a structured JSON object.

**Filtering Rule:**
- You MUST only consider messages that fall between **{{startDate}}** and **{{endDate}}** if those dates are provided.
- If no dates are provided, you MUST process all messages in the transcript.

For each product found, generate a complete object with:
- **title:** A concise, catchy title (under 60 characters).
- **description:** A well-formatted description using Markdown.
- **category:** A standard Shopify product category.
- **price:** This is critical. Extract the numeric selling price (e.g., from "Rs. 599" or "price 599"). If you absolutely cannot find a price, you MUST set it to 0.
- **sizes:** An array of available sizes.
- **colors:** An array of available colors.

Aggregate all product objects into a single 'products' array in the final output.

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
