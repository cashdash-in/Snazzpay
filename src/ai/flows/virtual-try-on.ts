'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * Optimized for contextual fitting: Saree/Lugra vs. Shirts/T-shirts/Dresses.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VirtualTryOnInputSchema = z.object({
  personImageDataUri: z
    .string()
    .describe("Customer photo as a data URI."),
  productImageDataUri: z
    .string()
    .describe("Product photo as a data URI."),
  productTitle: z.string().describe('Name of the product.'),
  drapeStyle: z.enum(['Standard Saree', 'East Indian Lugra', 'Western Wear']).optional().describe('The specific style requested by the user.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput) {
  try {
      console.log(`[Magic Mirror] Processing try-on for: ${input.productTitle} | Style: ${input.drapeStyle || 'Auto'}`);
      
      const isLugraStyle = input.drapeStyle === 'East Indian Lugra';
      const isSareeStyle = input.drapeStyle === 'Standard Saree';
      const isEthnic = isLugraStyle || isSareeStyle;

      let styleInstructions = '';

      if (isLugraStyle) {
          styleInstructions = `
            STYLING MODE: AUTHENTIC EAST INDIAN LUGRA (GAOTHAN STYLE)
            MANDATORY TRADITIONAL REQUIREMENTS:
            1. DRAPE: Apply the traditional "Gaothan" or "East Indian Catholic" style. The drape MUST be ankle-length or mid-calf (shorter than a standard saree).
            2. WAIST: Create the distinctive gathered pleats and tucks at the waist.
            3. BLOUSE: Generate a matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES. The sleeves MUST have a thick gold zari border.
            4. JEWELRY (ESSENTIAL): Automatically add traditional East Indian gold jewelry:
               - A long "Laxmi Haar" (gold coin necklace) reaching down to the stomach.
               - 1-2 shorter gold chokers or necklaces around the neck.
               - Multiple gold "Bangadi" bangles on BOTH wrists.
            5. HAIR: Add a traditional bun with a fresh "Gajra" (white flower garland).
          `;
      } else if (isSareeStyle) {
          styleInstructions = `
            STYLING MODE: STANDARD NIVI SAREE
            MANDATORY REQUIREMENTS:
            1. DRAPE: Apply a crisp, professional Nivi drape.
            2. LENGTH: Floor-length, elegantly covering the feet.
            3. BLOUSE: Generate a perfectly matching blouse with standard half-sleeves.
          `;
      } else {
          styleInstructions = `
            STYLING MODE: ACCURATE GARMENT REPLACEMENT (WESTERN WEAR)
            TASK: FIT the item from the second photo ("${input.productTitle}") perfectly onto the person.
            If the product is a Shirt or T-shirt, replace their top. 
            If the product is a Dress, replace their entire outfit.
            Ensure the garment follows the person's body structure and pose naturally.
          `;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST. 
            
            TASK: COMPLETELY RE-DRESS the person in the first photo using the garment shown in the second photo ("${input.productTitle}"). 
            
            ${styleInstructions}

            CRITICAL CONSTRAINTS:
            - ZERO CLOTHING BLEED: The person's current clothes (t-shirt collars, jeans, jacket sleeves, etc.) must be 100% invisible. The new virtual outfit must completely replace them.
            - FACIAL INTEGRITY: Keep the person's face, features, and hair texture exactly as they are in the original selfie.
            - REALISTIC PHYSICS: The fabric must fold, crease, and drape realistically according to the person's pose and body shape.
            
            Return ONLY the final high-resolution processed image.` 
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
          throw new Error('AI processed the request but did not return the image. Please try a different photo.');
      }

      return { generatedImageDataUri: media.url };
  } catch (err: any) {
      console.error("[Magic Mirror] Service Error:", err);
      throw new Error(`Try-on service error: ${err.message || 'The AI service is temporarily busy.'}`);
  }
}
