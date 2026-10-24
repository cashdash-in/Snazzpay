
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
        
        const searchLower = input.searchTerm.toLowerCase().trim();
        if (searchLower.length < 2) return [];

        const searchWords = searchLower.split(' ').filter(w => w.length > 1);
        
        // High-Precision Matching Logic
        return allProducts.filter(p => {
            const title = p.title.toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const wordMatch = searchWords.length > 0 && searchWords.some(word => title.includes(word) || cat.includes(word));
            const fullMatch = title.includes(searchLower) || cat.includes(searchLower);
            
            return wordMatch || fullMatch;
        }).slice(0, 8); // Slice to 8 to keep payload size within safety limits for LLM context
    } catch (e) {
        console.error("Global Tool Error:", e);
        return [];
    }
  }
);

export async function POST(request: Request) {
  try {
    const input = await request.json();
    
    if (!input.query) {
        return NextResponse.json({ answer: "How can I help you find the perfect product today? ✨" });
    }

    const localCatalog = (input.catalog || []).slice(0, 10).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        cat: p.category
    }));

    const systemPrompt = `You are the "Star Girl" AI Discovery Engine for ${input.storeName}. 
    
    SEARCH STRATEGY:
    1. LOCAL FIRST: Check this local list: ${JSON.stringify(localCatalog)}.
    2. GLOBAL SEARCH (CRITICAL): If the customer asks for ANY product NOT in the LOCAL list, use 'searchSnazzifyGlobal' immediately.
    3. BE COMPREHENSIVE: Show matching options from www.snazzify.co.in if the local store doesn't have it.
    4. UP-SELL: Suggest a "5% Bundle Discount" for matching accessories.
    
    STYLE: Use emojis ✨, ⭐. Be concise. 
    OUTPUT: Valid JSON matching the schema.`;

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
                    bundleOffer: z.string().optional(),
                    searchSuggestions: z.array(z.string()).optional()
                })
            }
        });

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
            answer: "I'm looking into our global vault right now! ✨ Could you tell me more about what you're looking for?",
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
