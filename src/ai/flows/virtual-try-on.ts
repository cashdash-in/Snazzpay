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
      
      const isLugra = input.productTitle.toUpperCase().includes("EAST INDIAN LUGRA");
      
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST SPECIALIZING IN TRADITIONAL INDIAN ATTIRE. 
            TASK: VIRTUALLY DRESS the person in the first photo using the clothing item shown in the second photo ("${input.productTitle}"). 
            
            CRITICAL INSTRUCTIONS:
            1. COMPLETELY REPLACE the person's current clothing. Their old clothes (collars, sleeves, jeans, T-shirts) must be 100% invisible.
            2. IF THE PRODUCT IS AN "EAST INDIAN LUGRA":
               - DRAPE STYLE: Apply the AUTHENTIC EAST INDIAN CATHOLIC / GAOTHAN VILLAGE STYLE.
               - LENGTH: The Lugra MUST be draped as a SHORT DRAPE (Mid-calf or Knee-length), showing the person's lower legs realistically.
               - WAIST: Tucked firmly and gathered at the waist with traditional pleats.
               - PALLU: The pallu should be narrow, draped over the left shoulder and tucked at the back/side.
               - BLOUSE: Generate a perfectly matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES and a thick gold zari border.
               - JEWELRY: Automatically add traditional East Indian gold jewelry: a long "Laxmi Haar" (gold coin necklace), a "Pote" (gold bead choker), and multiple gold "Bangadi" bangles on both wrists.
            3. IF THE PRODUCT IS A STANDARD SAREE:
               - Automatically generate and fit a matching, designer BLOUSE with ELBOW-LENGTH SLEEVES that complements the saree's color and pattern.
               - Apply a realistic Nivi or traditional drape.
            4. FACIAL PRESERVATION: Keep the person's face, hair, and original background perfectly intact and sharp.
            5. REALISTIC FIT: Drape the fabric realistically over their unique body structure, following their natural curves, posture, and arm positions.
            
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
