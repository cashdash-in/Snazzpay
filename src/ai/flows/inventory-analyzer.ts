'use server';
/**
 * @fileOverview AI flow to identify products from images, suggest market prices, 
 * and provide competitive insights to help sales.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CompetitorInfoSchema = z.object({
  sellerName: z.string().describe("Name of the platform or prominent seller"),
  price: z.number().describe("Their current selling price in INR"),
});

const InventoryAnalyzerInputSchema = z.object({
  imageDataUri: z.string().describe("Data URI of the product image"),
});

const InventoryAnalyzerOutputSchema = z.object({
  productName: z.string().describe("Identified name of the product"),
  suggestedMRP: z.number().describe("Estimated realistic market price in INR"),
  category: z.string().describe("Suggested category for the product"),
  description: z.string().describe("A professional description of the product"),
  sellingPoints: z.array(z.string()).describe("3-5 compelling reasons why a customer should buy this item"),
  marketInsight: z.string().describe("Brief insight about why this price was suggested"),
  competitors: z.array(CompetitorInfoSchema).describe("List of other sellers and their prices for this specific item"),
});

const inventoryAnalyzerPrompt = ai.definePrompt({
  name: 'inventoryAnalyzerPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: InventoryAnalyzerInputSchema },
  output: { schema: InventoryAnalyzerOutputSchema },
  prompt: `You are a retail inventory expert, market researcher, and sales coach in India. 
    1. Analyze the provided image to identify the exact product.
    2. Based on current market trends (Amazon India, Flipkart, local markets), suggest a realistic Maximum Retail Price (MRP) in INR.
    3. Identify 2-3 other major platforms or sellers (e.g., 'Amazon Seller', 'Local Boutique', 'Big Bazaar') currently selling this item and their approximate prices.
    4. Write a professional description.
    5. List 3-5 "Sales Hooks" or "Selling Points" that a shopkeeper can use to convince a customer to buy this item right now.
    
    Image: {{media url=imageDataUri}}`,
});

export async function analyzeInventoryItem(input: z.infer<typeof InventoryAnalyzerInputSchema>) {
  const { output } = await inventoryAnalyzerPrompt(input);
  if (!output) throw new Error("Could not analyze product image.");
  return output;
}
