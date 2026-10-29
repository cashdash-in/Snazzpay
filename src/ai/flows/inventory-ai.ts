'use server';
/**
 * @fileOverview AI flows for Inventory Intelligence.
 * Handles parsing voice/text commands and detecting items in photos.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductQtySchema = z.object({
  productName: z.string().describe("Common name of the product"),
  quantity: z.number().describe("Number of units (positive for purchase, negative for sale/loss)"),
  reason: z.string().optional().describe("Why the stock is moving (Sale, Damage, etc.)"),
});

/**
 * Parses natural language commands like "Sold 3 blue rosaries" into structured data.
 */
export async function parseInventoryCommand(text: string) {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    system: `You are an inventory assistant for a religious goods shop. 
    Convert user commands into a list of stock movements.
    - If they say "Sold", quantity should be negative.
    - If they say "Purchase" or "Added", quantity should be positive.
    - Map products to their most likely category.`,
    prompt: `Text: "${text}"`,
    output: { 
        schema: z.object({
            items: z.array(ProductQtySchema),
            summary: z.string()
        })
    },
  });

  if (!output) throw new Error("Could not understand the command.");
  return output;
}

/**
 * Uses vision to detect products and quantities from a photo of sold items or a shelf.
 */
export async function detectItemsInPhoto(imageDataUri: string, mode: 'sale' | 'audit' = 'sale') {
  const systemPrompt = mode === 'sale' 
    ? "Analyze this photo of items on a counter. List every product you see and count them exactly. These are items being sold."
    : "Analyze this photo of a storage shelf. Perform a visual count of every distinct product type you see. Be as precise as possible.";

  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash-image',
    prompt: [
        { text: systemPrompt },
        { media: { url: imageDataUri, contentType: 'image/jpeg' } }
    ],
    output: {
      schema: z.object({
        detections: z.array(z.object({
            productName: z.string(),
            count: z.number(),
            confidence: z.number()
        }))
      })
    }
  });

  if (!output) throw new Error("Vision analysis failed.");
  return output.detections;
}
