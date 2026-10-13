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

      let styleInstructions = '';

      if (isLugraStyle) {
          styleInstructions = `
            STYLING MODE: AUTHENTIC EAST INDIAN LUGRA (GAOTHAN PATTERN)
            MANDATORY TRADITIONAL REQUIREMENTS (MATCH REFERENCE PATTERN):
            1. DRAPE: Apply the traditional "Gaothan" East Indian Catholic village style. The drape MUST be mid-calf or ankle-length, showing the feet/ankles. It should have characteristic gathered pleats at the waist.
            2. WAIST & BELT: Automatically add a prominent, large, and heavy ORNATE GOLD WAIST BELT (KAMARBAND) over the Lugra at the waist level. This is essential for the authentic look.
            3. BLOUSE: Generate a matching or contrasting blouse with TRADITIONAL ELBOW-LENGTH SLEEVES. The sleeves MUST end exactly at the elbow and feature a broad, thick gold zari/brocade border.
            4. JEWELRY (HEAVY GOLD): Automatically add this specific jewelry set to the person:
               - "Laxmi Haar": A very long gold coin necklace that reaches down to the navel/waist belt.
               - "Layered Chokers": 2-3 shorter gold chokers (Pote) layered around the neck.
               - "Bangadi": A thick stack of gold bangles (Bangadi) covering a significant portion of BOTH wrists.
               - "Earrings": Large gold traditional studs or Jhumkas.
            5. HAIR: Add a traditional neat bun with a fresh white flower garland (Gajra).
          `;
      } else if (isSareeStyle) {
          styleInstructions = `
            STYLING MODE: STANDARD NIVI SAREE
            MANDATORY REQUIREMENTS:
            1. DRAPE: Apply a crisp, professional Nivi drape.
            2. LENGTH: Floor-length, elegantly covering the feet.
            3. BLOUSE: Generate a perfectly matching blouse with standard sleeves.
            4. ACCESSORIES: Add a gold necklace and small earrings for a complete look.
          `;
      } else {
          styleInstructions = `
            STYLING MODE: HYPER-REALISTIC GARMENT REPLACEMENT (WESTERN WEAR)
            TASK: COMPLETELY RE-DRESS the person in the first photo using ONLY the garment shown in the second photo ("${input.productTitle}").
            
            PRECISION REQUIREMENTS:
            - ANATOMICAL PHYSICS: The garment must follow the person's body structure, shoulders, and pose perfectly.
            - REALISTIC TEXTURE: Generate natural fabric folds, creases, and shadows that correspond to the wearer's posture and the lighting of the room.
            - ZERO CLOTHING BLEED: The wearer's original clothes (t-shirts, collars, necklines) MUST be 100% removed and replaced. No "peeking" of old clothes.
            - COLLAR & FIT: If it's a shirt, the collar must sit realistically around the neck. The garment should look like it was worn during the original photo shoot.
          `;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN ELITE VIRTUAL STYLIST AND IMAGE EDITOR. 
            
            TASK: COMPLETELY RE-DRESS the person in the first photo using the garment shown in the second photo ("${input.productTitle}"). 
            
            ${styleInstructions}

            CRITICAL CONSTRAINTS:
            - FACIAL INTEGRITY: Keep the person's face, features, skin tone, and hair texture exactly as they are in the original selfie. Only change the clothes and add the specified traditional accessories if requested.
            - REALISM: The final output must look like a real photograph, not a digital overlay. Match the lighting, grain, and shadows of the original selfie.
            
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
