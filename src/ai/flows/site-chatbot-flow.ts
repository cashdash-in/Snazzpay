
'use server';
/**
 * @fileOverview AI Flow to power the discovery engine for e-commerce sites.
 * Upgraded to act as a high-performance retail search engine.
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
  bundleDiscountOffer: z.string().optional().describe('A message about a discount if they bundle items'),
  searchSuggestions: z.array(z.string()).optional().describe('3-4 quick search follow-up terms for the user to click')
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
    try {
        const allProducts = await fetchLiveSnazzifyProducts();
        const searchLower = input.searchTerm.toLowerCase();
        return allProducts.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.category.toLowerCase().includes(searchLower)
        ).slice(0, 4);
    } catch (e) {
        console.error("Global Search Tool Error:", e);
        return [];
    }
  }
);

const siteChatbotFlow = ai.defineFlow(
  {
    name: 'siteChatbotFlow',
    inputSchema: SiteChatbotInputSchema,
    outputSchema: SiteChatbotOutputSchema,
  },
  async (input) => {
    const systemPrompt = `You are the "Discovery Engine" for "${input.storeName}". 
    Your mission is to find the PERFECT products for the user and maximize conversion.

    SEARCH STRATEGY:
    1. LOCAL FIRST: Search the LOCAL CATALOG (provided context below) for matches.
    2. GLOBAL SECOND: If no perfect matches exist locally, use 'searchSnazzifyGlobal' to fetch live results from our main inventory.
    3. UP-SELL: For every main item, suggest a matching accessory (e.g., matching shoes for a dress) and mention a "5% Bundle Discount".
    4. TRUST: Promote "Secure COD" (payment held in trust, released on dispatch) and "Shakti Card" rewards.

    CATALOG CONTEXT:
    ${input.catalog ? JSON.stringify(input.catalog) : 'No local products provided.'}

    INTERACTION STYLE:
    - Be energetic, Star-Girl themed, and extremely helpful.
    - Use emojis ✨, ⭐, 🚀.
    - Provide 3-4 "searchSuggestions" related to the query.
    - Always aim to get the user to click "Buy Now".`;

    try {
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: systemPrompt,
            prompt: input.query,
            tools: [searchSnazzifyGlobal],
            output: { schema: SiteChatbotOutputSchema }
        });

        if (!output) {
            return {
                answer: "I found some great results for you! Take a look ✨",
                recommendedProductIds: input.catalog?.slice(0, 2).map(p => p.id),
                searchSuggestions: ["Tell me more", "Show categories"]
            };
        }

        return output;
    } catch (error: any) {
        console.error("Site Chatbot Flow Error:", error);
        // Fallback response instead of throwing to prevent component crash
        return {
            answer: "My star-circuits are flickering slightly! I'm still here to help. What can I find for you? ✨",
            searchSuggestions: ["New Arrivals", "Secure COD Info"]
        };
    }
  }
);

/**
 * Asks the site's AI assistant a question.
 */
export async function askSiteAssistant(input: z.infer<typeof SiteChatbotInputSchema>) {
    return siteChatbotFlow(input);
}
