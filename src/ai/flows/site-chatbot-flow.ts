'use server';
/**
 * @fileOverview AI Flow to power the chatbot for generated e-commerce sites.
 * Upgraded to support product recommendations and bundling logic.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SiteChatbotInputSchema = z.object({
  siteId: z.string(),
  storeName: z.string(),
  persona: z.string(),
  query: z.string(),
  catalog: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    price: z.number(),
    category: z.string(),
    image: z.string().optional()
  })).optional(),
  history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
  })).optional()
});

const SiteChatbotOutputSchema = z.object({
  answer: z.string().describe('The AI assistant\'s response to the user query'),
  recommendedProductIds: z.array(z.string()).optional().describe('List of product IDs from the catalog to recommend as visual tiles'),
  bundleDiscountOffer: z.string().optional().describe('A message about a discount if they bundle items')
});

const siteChatbotFlow = ai.defineFlow(
  {
    name: 'siteChatbotFlow',
    inputSchema: SiteChatbotInputSchema,
    outputSchema: SiteChatbotOutputSchema,
  },
  async (input) => {
    const prompt = `You are a virtual sales assistant for "${input.storeName}".
    Your personality is: "${input.persona}".

    CATALOG CONTEXT:
    {{#if catalog}}
    Here is the list of products currently available:
    {{json catalog}}
    {{else}}
    No specific catalog provided.
    {{/if}}
    
    Guidelines:
    - Be helpful, polite, and stay in character.
    - If the user asks for a category (e.g. "show me sarees", "what shoes do you have?"), look through the CATALOG CONTEXT and return the matching IDs in the 'recommendedProductIds' field.
    - BUNDLING STRATEGY: Always look for "Mix & Match" opportunities. 
      - If they look at a Saree/Dress, suggest a matching Accessory (Necklace, Watch, etc.).
      - If they bundle, you are AUTHORIZED to offer a "5% Bundle Discount" on the total value.
    - Encourage users to browse the collection and use "Secure COD" for safe shopping.
    - Keep responses concise and focused on helping the customer find what they need.

    User Question: ${input.query}`;

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: prompt,
        output: { schema: SiteChatbotOutputSchema }
    });

    return output!;
  }
);

/**
 * Asks the site's AI assistant a question.
 * @param input The user's query and store context.
 * @returns The assistant's response.
 */
export async function askSiteAssistant(input: z.infer<typeof SiteChatbotInputSchema>) {
    return siteChatbotFlow(input);
}
