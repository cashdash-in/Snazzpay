
'use server';
/**
 * @fileOverview AI Flow to power the chatbot for generated e-commerce sites.
 * Upgraded to support real-time global inventory integration from www.snazzify.co.in.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchLiveSnazzifyProducts } from '@/services/snazzify-global';

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
  recommendedProductIds: z.array(z.string()).optional().describe('List of product IDs from the local catalog to recommend'),
  externalRecommendations: z.array(z.object({
    title: z.string(),
    price: z.number(),
    imageUrl: z.string(),
    url: z.string()
  })).optional().describe('Live recommendations fetched from www.snazzify.co.in'),
  bundleDiscountOffer: z.string().optional().describe('A message about a discount if they bundle items')
});

/**
 * Tool for the AI to "enter" and search the live snazzify.co.in catalog.
 */
const searchSnazzifyGlobal = ai.defineTool(
  {
    name: 'searchSnazzifyGlobal',
    description: 'Searches the live product catalog on www.snazzify.co.in for items not in the local collection.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The product name or category to search for in the global store.')
    }),
    outputSchema: z.array(z.object({
        title: z.string(),
        price: z.number(),
        imageUrl: z.string(),
        url: z.string(),
        category: z.string()
    })),
  },
  async (input) => {
    const allProducts = await fetchLiveSnazzifyProducts();
    // Simple filter logic for the tool
    return allProducts.filter(p => 
        p.title.toLowerCase().includes(input.searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(input.searchTerm.toLowerCase())
    ).slice(0, 3);
  }
);

const siteChatbotFlow = ai.defineFlow(
  {
    name: 'siteChatbotFlow',
    inputSchema: SiteChatbotInputSchema,
    outputSchema: SiteChatbotOutputSchema,
  },
  async (input) => {
    const systemPrompt = `You are a virtual sales assistant for "${input.storeName}".
    Your persona: "${input.persona}".

    CATALOG CONTEXT (This is your current local collection):
    {{#if catalog}}
    {{json catalog}}
    {{else}}
    No specific catalog provided.
    {{/if}}
    
    GUIDELINES:
    1. Help the user find products from the LOCAL CATALOG first. If matches exist, return their IDs in 'recommendedProductIds'.
    
    2. LIVE INTEGRATION: If the requested item or category is NOT in the LOCAL CATALOG, you MUST use the 'searchSnazzifyGlobal' tool to fetch live products from www.snazzify.co.in. 
       - Fetch these items and show them to the user.
       - Map the tool's output to the 'externalRecommendations' field.
    
    3. BUNDLING: Suggest a matching accessory for any main item (e.g., Necklace for a Saree) and offer a "5% Bundle Discount" on the total.

    4. TRUST: Promote "Secure COD" as the safest way to shop. Keep responses cheerful and star-themed! ✨`;

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        system: systemPrompt,
        prompt: input.query,
        tools: [searchSnazzifyGlobal],
        output: { schema: SiteChatbotOutputSchema }
    });

    return output!;
  }
);

/**
 * Asks the site's AI assistant a question.
 */
export async function askSiteAssistant(input: z.infer<typeof SiteChatbotInputSchema>) {
    return siteChatbotFlow(input);
}
