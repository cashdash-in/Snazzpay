'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * Optimized for sarees, lugras, and complete clothing replacement with user-selected styles.
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
  drapeStyle: z.enum(['Standard Saree', 'East Indian Lugra']).optional().describe('The specific draping style requested by the user.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput) {
  try {
      console.log(`[Magic Mirror] Processing ${input.drapeStyle || 'standard'} try-on for: ${input.productTitle}`);
      
      const isLugraStyle = input.drapeStyle === 'East Indian Lugra' || input.productTitle.toLowerCase().includes('lugra');

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST SPECIALIZING IN TRADITIONAL EAST INDIAN CATHOLIC AND MAHARASHTRIAN ATTIRE. 
            
            TASK: COMPLETELY RE-DRESS the person in the first photo using the saree/lugra shown in the second photo ("${input.productTitle}"). 
            
            STYLING MODE: ${isLugraStyle ? 'AUTHENTIC EAST INDIAN LUGRA (GAOTHAN STYLE)' : 'STANDARD NIVI SAREE'}
            
            ${isLugraStyle ? `
            MANDATORY TRADITIONAL REQUIREMENTS FOR EAST INDIAN LUGRA:
            1. DRAPE: Apply the traditional "Gaothan" or "East Indian Catholic" style. The drape MUST be ankle-length or mid-calf (shorter than a standard saree).
            2. WAIST: Create the distinctive gathered pleats and tucks at the waist.
            3. BLOUSE: Generate a matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES. The sleeves MUST have a thick gold zari border.
            4. JEWELRY (ESSENTIAL): Automatically add traditional East Indian gold jewelry:
               - A long "Laxmi Haar" (gold coin necklace) reaching down to the stomach.
               - 1-2 shorter gold chokers or necklaces around the neck.
               - Multiple gold "Bangadi" bangles on BOTH wrists, covering a significant part of the forearms.
               - A gold "Kamarbandh" (waist belt) if appropriate for the drape.
            5. HAIR: Add a traditional bun or braid with a fresh "Gajra" (white flower garland).
            ` : `
            MANDATORY REQUIREMENTS FOR STANDARD SAREE:
            - DRAPE: Apply a crisp, professional Nivi drape.
            - LENGTH: Floor-length, elegantly covering the feet.
            - BLOUSE: Generate a perfectly matching blouse with standard half-sleeves.
            `}

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
