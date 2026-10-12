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
            
            CRITICAL INSTRUCTIONS:
            1. COMPLETELY REPLACE the person's current clothing. Their old clothes must be 100% invisible under the new outfit.
            2. If the product name contains "EAST INDIAN LUGRA":
               - DRAPE STYLE: Follow the authentic East Indian Catholic / Gaothan traditional drape style. 
               - BLOUSE: Generate a perfectly matching or beautifully contrasting designer blouse with ELBOW-LENGTH SLEEVES and a gold zari border.
               - ACCESSORIES: Add traditional East Indian gold jewelry: a heavy gold necklace (Laxmi Haar), a gold pote/choker, and multiple gold bangles (Bangadi) on both wrists.
            3. For SAREES: Automatically generate and fit a matching, designer BLOUSE that complements the saree's color and pattern.
            4. FACIAL PRESERVATION: Keep the person's face, hair, and original background perfectly intact.
            5. REALISTIC FIT: Drape the fabric realistically over their unique body structure, following the natural curves and posture.
            
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
