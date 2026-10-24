
import { NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchLiveSnazzifyProducts } from '@/services/snazzify-global';

export const maxDuration = 60;

const searchSnazzifyGlobal = ai.defineTool(
  {
    name: 'searchSnazzifyGlobal',
    description: 'Searches the live product catalog on www.snazzify.co.in for items not in the local collection.',
    inputSchema: z.object({
      searchTerm: z.string().describe('The product name or category to search for in the global store.')
    }),
    outputSchema: z.array(z.any()),
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
        return [];
    }
  }
);

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const systemPrompt = `You are the "Star Girl" Discovery Engine for "${input.storeName}". 
    SEARCH STRATEGY:
    1. LOCAL FIRST: Search the LOCAL CATALOG context for matches.
    2. GLOBAL SECOND: Use 'searchSnazzifyGlobal' if no local matches exist.
    3. UP-SELL: Mention a "5% Bundle Discount" for matching accessories.
    
    LOCAL CATALOG: ${JSON.stringify((input.catalog || []).slice(0, 10))}
    STYLE: Be brief. Use emojis ✨, ⭐. 
    OUTPUT: Always return a JSON object with answer, searchSuggestions, and recommendedProductIds.`;

    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        system: systemPrompt,
        prompt: input.query,
        tools: [searchSnazzifyGlobal],
        output: { 
            schema: z.object({
                answer: z.string(),
                recommendedProductIds: z.array(z.string()).optional(),
                externalRecommendations: z.array(z.any()).optional(),
                bundleDiscountOffer: z.string().optional(),
                searchSuggestions: z.array(z.string()).optional()
            })
        }
    });

    return NextResponse.json(output || { answer: "I found some great options for you! ✨", searchSuggestions: ["Best Sellers", "New Arrivals"] });
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
