'use server';
/**
 * @fileOverview AI flows for Inventory Intelligence.
 * Handles parsing voice/text commands, detecting items in photos, and matching bills to products.
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
 * Uses vision to detect products and quantities from a photo.
 * Upgraded to return bounding boxes for Magic AI Segregation (auto-cropping).
 */
export async function detectItemsInPhoto(imageDataUri: string, mode: 'sale' | 'audit' | 'intake' = 'sale') {
  let systemPrompt = "";
  
  if (mode === 'sale') {
      systemPrompt = "Act as a professional retail checkout scanner. Identify every product visible in this photo on the counter and count their quantities. These items are currently being sold.";
  } else if (mode === 'audit') {
      systemPrompt = "Act as a precise inventory auditor. Look at this shelf photo. Identify every distinct product and count exactly how many are present. Be very specific with product names.";
  } else if (mode === 'intake') {
      systemPrompt = "Act as an intake manager. Analyze this photo of multiple new products. IDENTIFY each distinct product and provide its BOUNDING BOX coordinates [ymin, xmin, ymax, xmax] normalized to 0-1000 so they can be cropped into individual images. Ensure every unique item type has a box.";
  }

  try {
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: [
            { text: systemPrompt },
            { media: { url: imageDataUri, contentType: 'image/jpeg' } }
        ],
        output: {
          schema: z.object({
            detections: z.array(z.object({
                productName: z.string().describe("The name of the identified product"),
                count: z.number().describe("The number of units detected"),
                category: z.string().describe("Suggested category"),
                confidence: z.number().describe("AI confidence score (0-1)"),
                box_2d: z.array(z.number()).optional().describe("Bounding box [ymin, xmin, ymax, xmax] normalized 0-1000")
            }))
          })
        }
      });

      if (!output) return [];
      return output.detections;
  } catch (error: any) {
      console.error("detectItemsInPhoto AI error:", error);
      return [];
  }
}

/**
 * Parses a purchase bill and matches it to a product photo.
 */
export async function matchProductToBill(billDataUri: string, productDataUri: string) {
    try {
        const { output } = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            system: `You are an expert procurement analyst. 
            TASK: 
            1. Read the provided PURCHASE BILL image (Photo 1).
            2. Identify the product shown in the PRODUCT PHOTO (Photo 2).
            3. Find the matching line item on the bill.
            4. Extract the Purchase Quantity, Wholesale Price (Unit Price), and Name.
            
            Return the details of the matched item only.`,
            prompt: [
                { text: "Image 1 is the Supplier Bill. Image 2 is the actual product. Identify the product from the bill." },
                { media: { url: billDataUri, contentType: 'image/jpeg' } },
                { media: { url: productDataUri, contentType: 'image/jpeg' } }
            ],
            output: {
                schema: z.object({
                    productName: z.string().describe("The name of the matched product on the bill"),
                    quantity: z.number().describe("The quantity purchased as per bill"),
                    wholesalePrice: z.number().describe("The unit purchase price from the bill"),
                    mrp: z.number().describe("Suggested MRP based on purchase price (approx 100% margin if not found)"),
                    category: z.string().describe("Suggested category"),
                    supplierName: z.string().optional().describe("Name of the supplier from bill")
                })
            }
        });

        if (!output) throw new Error("Could not match product to bill.");
        return output;
    } catch (error: any) {
        console.error("matchProductToBill AI error:", error);
        throw new Error(`Bill processing failed: ${error.message}`);
    }
}
