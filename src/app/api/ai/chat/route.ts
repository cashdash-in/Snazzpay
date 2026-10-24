
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
        console.error("Global Tool Error:", e);
        return [];
    }
  }
);

export async function POST(request: Request) {
  try {
    const input = await request.json();
    
    // Lean context to prevent payload errors
    const localCatalog = (input.catalog || []).slice(0, 15).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        cat: p.category
    }));

    const systemPrompt = `You are the "Star Girl" AI Discovery Engine for ${input.storeName}. 
    
    SEARCH STRATEGY:
    1. LOCAL FIRST: Check this list: ${JSON.stringify(localCatalog)}.
    2. GLOBAL SECOND: Use 'searchSnazzifyGlobal' ONLY if no local matches exist.
    3. UP-SELL: Suggest a "5% Bundle Discount" for matching accessories.
    
    STYLE: Use emojis ✨, ⭐. Be concise. 
    OUTPUT: Valid JSON only.`;

    try {
        const response = await ai.generate({
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

        // Use safe extraction of output
        const aiOutput = response.output;
        
        if (!aiOutput) {
            return NextResponse.json({
                answer: "I found some great options for you! Let me know if you want to see more. ✨",
                searchSuggestions: ["Best Sellers", "New Arrivals"]
            });
        }

        return NextResponse.json(aiOutput);
    } catch (aiError: any) {
        console.error("Internal ai.generate error:", aiError);
        return NextResponse.json({
            answer: "I'm looking into our vault right now! ✨ Could you tell me more about what you're looking for?",
            searchSuggestions: ["Latest Collection", "Discounted Items"]
        });
    }
  } catch (error: any) {
    console.error('API Chat Route Crash:', error);
    return NextResponse.json({ 
        answer: "My star-sensors are resetting! ✨ Please ask me again in a moment.",
        searchSuggestions: ["Refresh Page"]
    });
  }
}
