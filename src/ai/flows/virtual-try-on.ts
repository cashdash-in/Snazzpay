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
            text: `ACT AS AN EXPERT VIRTUAL STYLIST SPECIALIZING IN TRADITIONAL INDIAN ATTIRE. 
            TASK: VIRTUALLY DRESS the person in the first photo using the clothing item shown in the second photo ("${input.productTitle}"). 
            
            STYLING INSTRUCTION: ${isLugraStyle ? 'APPLY AUTHENTIC EAST INDIAN LUGRA STYLE' : 'APPLY STANDARD SAREE STYLE'}
            
            ${isLugraStyle ? `
            CRITICAL INSTRUCTIONS FOR EAST INDIAN LUGRA:
            - DRAPE: APPLY THE AUTHENTIC EAST INDIAN CATHOLIC / GAOTHAN VILLAGE DRAPE.
            - LENGTH: THIS IS A SHORT DRAPE. The fabric MUST end at MID-CALF or KNEE LENGTH.
            - VISIBILITY: THE LOWER LEGS MUST BE CLEARLY VISIBLE and realistic. DO NOT drape to the floor.
            - BLOUSE: Generate a perfectly matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES and a thick gold zari border.
            - JEWELRY: Automatically add traditional East Indian gold jewelry: a long "Laxmi Haar" (gold coin necklace), a "Pote" (gold bead choker), and multiple gold "Bangadi" bangles on both wrists.
            ` : `
            CRITICAL INSTRUCTIONS FOR STANDARD SAREE:
            - DRAPE: Apply a realistic Nivi drape.
            - LENGTH: The fabric MUST reach the floor, covering the feet or just showing toes.
            - BLOUSE: Generate a matching blouse with half-sleeves.
            `}

            GENERAL CONSTRAINTS FOR ALL ATTIRE:
            1. COMPLETELY REPLACE the person's current clothing. Their old clothes (collars, sleeves, jeans, T-shirts) must be 100% invisible.
            2. FACIAL PRESERVATION: Keep the person's face, hair, and original background perfectly intact and sharp.
            3. REALISTIC FIT: Drape the fabric realistically over their unique body structure, following their natural curves and posture.
            
            Return ONLY the final processed image.` 
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
      throw new Error(`Try-on service error: ${err.message || 'The AI service is temporarily busy. Please try again in a few seconds.'}`);
  }
}
