'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * Optimized for sarees, lugras, and complete clothing replacement.
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
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput) {
  try {
      console.log(`[Magic Mirror] Processing advanced try-on for: ${input.productTitle}`);
      
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST SPECIALIZING IN TRADITIONAL INDIAN ATTIRE. 
            TASK: VIRTUALLY DRESS the person in the first photo using the clothing item shown in the second photo ("${input.productTitle}"). 
            
            CRITICAL INSTRUCTIONS FOR "EAST INDIAN LUGRA":
            - IF THE PRODUCT TITLE CONTAINS "LUGRA", YOU MUST APPLY THE AUTHENTIC EAST INDIAN CATHOLIC / GAOTHAN VILLAGE DRAPE.
            - DRAPE LENGTH: THIS IS A SHORT DRAPE. The fabric MUST end at MID-CALF or KNEE LENGTH.
            - VISIBILITY: THE LOWER LEGS MUST BE CLEARLY VISIBLE. DO NOT drape to the floor like a standard saree.
            - STYLE: The Lugra must be tucked firmly at the waist with traditional gathered pleats. The pallu should be narrow, draped over the left shoulder, and tucked at the back.
            - BLOUSE: Generate a perfectly matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES and a thick gold zari border.
            - JEWELRY: Automatically add traditional East Indian gold jewelry: a long "Laxmi Haar" (gold coin necklace), a "Pote" (gold bead choker), and multiple gold "Bangadi" bangles on both wrists.

            CRITICAL INSTRUCTIONS FOR ALL OTHER ATTIRE:
            1. COMPLETELY REPLACE the person's current clothing. Their old clothes (collars, sleeves, jeans, T-shirts) must be 100% invisible.
            2. FACIAL PRESERVATION: Keep the person's face, hair, and original background perfectly intact and sharp.
            3. REALISTIC FIT: Drape the fabric realistically over their unique body structure, following their natural curves and posture.
            4. STANDARD SAREES: If not a Lugra, apply a realistic Nivi drape and a matching elbow-length sleeve blouse.
            
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
