
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
        if (!allProducts || allProducts.length === 0) return [];
        
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
    // We construct the prompt carefully to avoid overwhelming the model
    const systemPrompt = `You are the "Discovery Engine" for "${input.storeName}". 
    Your mission is to find the PERFECT products for the user.

    SEARCH STRATEGY:
    1. LOCAL FIRST: Search the LOCAL CATALOG (context below) for matches.
    2. GLOBAL SECOND: Use 'searchSnazzifyGlobal' ONLY if no local matches exist.
    3. UP-SELL: Mention a "5% Bundle Discount" for matching accessories.
    4. TRUST: Promote "Secure COD" and "Shakti Card".

    LOCAL CATALOG:
    ${input.catalog ? JSON.stringify(input.catalog) : 'No local products.'}

    STYLE:
    - Use emojis ✨, ⭐, 🚀.
    - Be brief and helpful.
    - Provide searchSuggestions for quick clicking.`;

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
                answer: "I found some great options for you! ✨",
                recommendedProductIds: (input.catalog || []).slice(0, 2).map(p => p.id),
                searchSuggestions: ["Tell me more", "How do I buy?"]
            };
        }

        return output;
    } catch (error: any) {
        console.error("Site Chatbot Flow Error:", error);
        return {
            answer: "I'm here to help! Let me look into that for you. What else can I find? ✨",
            searchSuggestions: ["New Arrivals", "Best Sellers"]
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
