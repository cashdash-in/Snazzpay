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
            text: `ACT AS AN EXPERT VIRTUAL STYLIST. 
            TASK: VIRTUALLY DRESS the person in the first photo using the clothing item shown in the second photo ("${input.productTitle}"). 
            
            CRITICAL INSTRUCTIONS:
            1. COMPLETELY REPLACE the person's current clothing. Their old clothes should be 100% invisible under the new outfit.
            2. For SAREES or LUGRAS: Automatically generate and fit a matching, designer BLOUSE that complements the saree's color and pattern.
            3. For EAST INDIAN LUGRAS: Ensure the specific traditional drape style is maintained. Add appropriate traditional ACCESSORIES (like a gold necklace or bangles) to complete the authentic look.
            4. FACIAL PRESERVATION: Keep the person's face, hair, and original background perfectly intact.
            5. REALISTIC FIT: Drape the fabric realistically over their body structure, following the natural curves and posture.
            
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
