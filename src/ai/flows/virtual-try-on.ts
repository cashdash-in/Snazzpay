'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * Optimized for contextual fitting: Saree/Lugra, Kurti, Western Dress, and Sleeve variations.
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
  drapeStyle: z.enum(['Standard Saree', 'East Indian Lugra', 'Western Wear', 'Western Dress', 'Kurti']).optional().describe('The specific style requested by the user.'),
  sleeveLength: z.enum(['Half Sleeves', 'Full Sleeves', 'Sleeveless']).optional().describe('Preferred sleeve length for the garment.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput) {
  try {
      console.log(`[Magic Mirror] Processing try-on for: ${input.productTitle} | Style: ${input.drapeStyle || 'Auto'} | Sleeves: ${input.sleeveLength || 'Default'}`);
      
      const isLugraStyle = input.drapeStyle === 'East Indian Lugra';
      const isSareeStyle = input.drapeStyle === 'Standard Saree';
      const isKurtiStyle = input.drapeStyle === 'Kurti';
      const isDressStyle = input.drapeStyle === 'Western Dress';

      let styleInstructions = '';

      if (isLugraStyle) {
          styleInstructions = `
            STYLING MODE: AUTHENTIC EAST INDIAN LUGRA (GAOTHAN VILLAGE PATTERN)
            CRITICAL STYLE CONSTRAINT: Use ONLY authentic East Indian Catholic Gaothan accessories. DO NOT use South Indian or Temple jewelry.
            
            MANDATORY TRADITIONAL REQUIREMENTS:
            1. DRAPE: Apply the traditional "Gaothan" East Indian village style. The drape MUST be mid-calf or ankle-length, clearly showing the feet/ankles.
            2. WAIST & BELT: Automatically add a prominent ORNATE GOLD WAIST BELT (KAMARBAND) over the Lugra at the waist level to hold the gathered pleats.
            3. BLOUSE: Generate a matching blouse with TRADITIONAL ELBOW-LENGTH SLEEVES. The sleeves MUST end at the elbow and feature a gold zari border.
            4. ACCESSORIES: Automatically add authentic gold jewelry:
               - "Laxmi Haar": A long gold coin necklace reaching the navel.
               - "Gold Chokers": Multiple layered gold bead necklaces around the neck.
               - "Bangadi": A stack of thick gold bangles on BOTH wrists.
            5. HAIR: Style the person's hair into a neat bun adorned with a white flower garland (Gajra).
          `;
      } else if (isSareeStyle) {
          styleInstructions = `
            STYLING MODE: STANDARD NIVI SAREE
            1. DRAPE: Apply a crisp, professional floor-length Nivi drape.
            2. BLOUSE: Generate a perfectly matching blouse. ${input.sleeveLength ? `Ensure sleeves are ${input.sleeveLength}.` : 'Standard short sleeves.'}
            3. ACCESSORIES: Add simple, elegant gold jewelry suitable for a standard saree.
          `;
      } else if (isKurtiStyle) {
          styleInstructions = `
            STYLING MODE: TRADITIONAL KURTI FIT
            1. TASK: Fit the Kurti from the second photo onto the person. 
            2. LENGTH: Maintain the Kurti's original length (usually hip or knee length).
            3. SLEEVES: ${input.sleeveLength ? `Modify the garment to have ${input.sleeveLength}.` : 'Maintain original garment sleeves.'}
            4. BOTTOM: Match with neutral leggings or jeans if legs are visible.
          `;
      } else if (isDressStyle) {
          styleInstructions = `
            STYLING MODE: WESTERN DRESS FIT
            1. TASK: Re-dress the person in the one-piece dress shown in the product photo.
            2. SILHOUETTE: Follow the flow and cut of the dress perfectly.
            3. SLEEVES: ${input.sleeveLength ? `Modify the garment to have ${input.sleeveLength}.` : 'Maintain original garment sleeves.'}
          `;
      } else {
          styleInstructions = `
            STYLING MODE: HYPER-REALISTIC FULL GARMENT REPLACEMENT (SHIRT/WESTERN WEAR)
            TASK: COMPLETELY RE-DRESS the person using ONLY the garment shown in the product photo ("${input.productTitle}").
            - FULL FIT: Ensure the entire shirt/t-shirt is visible and fits the person's torso perfectly.
            - ANATOMICAL PHYSICS: Fabric folds, shadows, and creases must realistically match the person's pose and lighting.
            - SLEEVES: ${input.sleeveLength ? `Force the garment to have ${input.sleeveLength}.` : 'Maintain original sleeves.'}
            - ZERO CLOTHING BLEED: Ensure 100% removal of original clothes. No original collars or undershirts should be visible.
          `;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN ELITE VIRTUAL STYLIST. 
            
            TASK: COMPLETELY RE-DRESS the person in the first photo using the garment shown in the second photo ("${input.productTitle}"). 
            
            ${styleInstructions}

            CRITICAL CONSTRAINTS:
            - FACIAL INTEGRITY: Keep the person's face, features, and hair exactly as they are (unless a bun/Gajra is specified for Lugra).
            - REALISM: The final output must look like a high-resolution professional photograph.
            - CLEANLINESS: The person's original clothes must be totally invisible.
            
            Return ONLY the final high-resolution processed image.` 
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (!media?.url) {
          throw new Error('AI processed the request but did not return the image.');
      }

      return { generatedImageDataUri: media.url };
  } catch (err: any) {
      console.error("[Magic Mirror] Service Error:", err);
      throw new Error(`Try-on service error: ${err.message || 'The AI service is temporarily busy.'}`);
  }
}
