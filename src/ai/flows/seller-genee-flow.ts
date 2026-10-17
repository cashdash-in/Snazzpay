'use server';
/**
 * @fileOverview ASK.ME Genee - An AI marketplace consultant for sellers.
 * Provides step-by-step guidance for Amazon, Flipkart, social media, etc.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SellerGeneeInputSchema = z.object({
  query: z.string().describe('The seller\'s question about marketplaces or business growth.'),
  sellerContext: z.object({
    name: z.string().optional(),
    currentPlatform: z.string().optional(),
    inventoryCount: z.number().optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() })),
  })).optional(),
});

const SellerGeneeOutputSchema = z.object({
  advice: z.string().describe('The step-by-step guidance or advice provided by the Genee.'),
  nextSteps: z.array(z.string()).describe('A list of immediate actions for the seller.'),
  profitTip: z.string().describe('A specific tip to ensure the seller remains profitable on this marketplace.'),
});

export async function askSellerGenee(input: z.infer<typeof SellerGeneeInputSchema>) {
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system: `You are the "ASK.ME Genee", a high-tech, friendly, and expert AI Marketplace Consultant. 
    Your mission is to help small sellers in India successfully expand to Amazon, Flipkart, Myntra, Facebook, and Instagram.
    
    GUIDELINES:
    1. Provide clear, numbered, step-by-step instructions.
    2. Focus heavily on PROFITABILITY. Advise on commissions, hidden fees, and pricing strategy.
    3. Use a helpful, futuristic, and encouraging tone (The "Genee" persona).
    4. If the seller is new, explain terms like AWB, SKU, and Marketplace Commission simply.
    5. Always include a "Profit Tip" for the specific marketplace mentioned.
    
    CONTEXT:
    The user is currently using Snazzify, which helps them with Secure COD and local trust. You are an extension of this service.`,
    prompt: input.query,
    messages: input.history,
    output: { schema: SellerGeneeOutputSchema },
  });

  if (!response.output) throw new Error("The Genee is momentarily unavailable.");
  return response.output;
}
