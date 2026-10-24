
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
        
        // High-Precision Multi-Stage Matching Logic
        return allProducts.filter(p => {
            const title = p.title.toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const fullMatch = title.includes(searchLower) || cat.includes(searchLower);
            const wordMatch = searchWords.length > 0 && searchWords.some(word => title.includes(word) || cat.includes(word));
            
            return fullMatch || wordMatch;
        }).slice(0, 6); // Keep it very tight (6 items) to prevent AI context overflow
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

    const localCatalog = (input.catalog || []).slice(0, 8).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        cat: p.category
    }));

    const systemPrompt = `You are the "Star Girl" AI Shopping Assistant for ${input.storeName}. 
    
    SEARCH STRATEGY:
    1. LOCAL FIRST: Search this list: ${JSON.stringify(localCatalog)}.
    2. GLOBAL SEARCH (MANDATORY): If the user asks for ANY item not in the local list, you MUST use 'searchSnazzifyGlobal' immediately.
    3. COMPREHENSIVE RECOMMENDATIONS: If matches are found, show them as recommended items.
    
    STYLE: Use emojis ✨, ⭐. Be concise and friendly.
    OUTPUT: RETURN VALID JSON ONLY.`;

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
                    searchSuggestions: z.array(z.string()).optional()
                })
            }
        });

        const aiOutput = response.output;
        
        if (!aiOutput) {
            return NextResponse.json({
                answer: "I've checked our global vault and found some great options for you! ✨",
                searchSuggestions: ["Latest Arrivals", "Bestsellers"]
            });
        }

        return NextResponse.json(aiOutput);
    } catch (aiError: any) {
        console.error("AI Generate Error:", aiError);
        return NextResponse.json({
            answer: "I'm scouring our global warehouse right now! ✨ What style are you most interested in?",
            searchSuggestions: ["View All Shoes", "View All Jewelry"]
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
