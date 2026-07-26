'use server';
/**
 * @fileOverview AI flow to identify products from images and suggest market prices.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const InventoryAnalyzerInputSchema = z.object({
  imageDataUri: z.string().describe("Data URI of the product image"),
});

const InventoryAnalyzerOutputSchema = z.object({
  productName: z.string().describe("Identified name of the product"),
  suggestedMRP: z.number().describe("Estimated market price in INR"),
  category: z.string().describe("Suggested category for the product"),
  marketInsight: z.string().describe("Brief insight about why this price was suggested"),
});

const inventoryAnalyzerPrompt = ai.definePrompt({
  name: 'inventoryAnalyzerPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: InventoryAnalyzerInputSchema },
  output: { schema: InventoryAnalyzerOutputSchema },
  prompt: `You are a retail inventory expert and market researcher. 
    1. Analyze the provided image to identify the product.
    2. Based on current market trends in India, suggest a realistic Maximum Retail Price (MRP) in INR.
    3. Categorize the product.
    
    Image: {{media url=imageDataUri}}`,
});

export async function analyzeInventoryItem(input: z.infer<typeof InventoryAnalyzerInputSchema>) {
  const { output } = await inventoryAnalyzerPrompt(input);
  if (!output) throw new Error("Could not analyze product image.");
  return output;
}
