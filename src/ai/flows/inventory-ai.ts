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
    system: `You are an elite inventory assistant for a specialized retail shop. 
    Convert user voice or text commands into a structured list of stock movements.
    
    LOGIC:
    - "Sold", "Given", "Gone" -> Quantity should be NEGATIVE (e.g. -3).
    - "Bought", "Purchased", "Added", "Restock" -> Quantity should be POSITIVE (e.g. +5).
    - "Damaged", "Broken", "Lost" -> Quantity should be NEGATIVE.
    
    Output a JSON object with 'items' (array of movements) and a 'summary'.`,
    prompt: `Process this command: "${text}"`,
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
    ? "Act as a checkout scanner. Analyze this photo of items on a counter. Identify every product and count them accurately. These items are being sold."
    : "Act as an inventory auditor. Analyze this photo of a storage shelf. Perform a visual count of every distinct product type you see. Be extremely precise.";

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

  if (!output) return [];
  return output.detections;
}
