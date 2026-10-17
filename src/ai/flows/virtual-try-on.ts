'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * Optimized for contextual fitting: Saree/Lugra (Authentic Gaothan), Kurti, Western Dress, and Sleeve variations.
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
            CRITICAL STYLE CONSTRAINT: Match the specific drape and accessory style of a traditional East Indian lady (Gaothan aesthetic).
            
            MANDATORY TRADITIONAL REQUIREMENTS:
            1. DRAPE: Apply the traditional "Lugra" drape. The pallu should be draped elegantly over the left shoulder. The drape should be ankle-length. 
            2. WAIST: The drape is tucked neatly at the waist with prominent gathered pleats. DO NOT add any waist belt or Kamar Pata.
            3. BLOUSE: Generate a matching blouse (matching the fabric in the second photo) with traditional sleeves ending at the elbow.
            4. ACCESSORIES: Automatically add ONLY these authentic gold jewelry items:
               - "East Indian Pote": A long traditional gold bead necklace with a distinct pendant reaching the navel area.
               - Layered Necklaces: Include a gold choker and a medium-length gold necklace.
               - "Bangadi": A stack of thick gold bangles on BOTH wrists.
               - STRICTLY FORBIDDEN: Do not add any South Indian temple jewelry or modern heavy long necklaces.
            5. HAIR & FACE: 
               - Style the hair into a neat bun.
               - CRITICAL: REMOVE any sindoor, bindi, or red powder from the forehead or hair parting. The forehead MUST be clean.
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
          // Western Wear mode (Mini/Tight Fit transformation for fabrics, or standard for tops)
          styleInstructions = `
            STYLING MODE: MODERN WESTERN WEAR (TRANSFORMATION)
            1. TASK: COMPLETELY RE-DRESS the person using the material and pattern from the second photo ("${input.productTitle}").
            2. FABRIC TRANSFORMATION: If the second photo is a fabric (like a Saree or Lugra), transform it into a modern WESTERN OUTFIT. 
               - SPECIFIC CUT: Generate a TIGHT-FITTING MINI SKIRT or TIGHT BODYCON MIDI SKIRT and a matching TIGHT-FITTING MODERN CROP TOP.
               - The outfit must look like high-end boutique western wear.
            3. SHIRT/TOP FIT: If the product is already a shirt or t-shirt, ensure the entire garment is visible and fits the person's torso perfectly with a professional "Standard Fitting".
            4. SLEEVES: ${input.sleeveLength ? `Force the garment to have ${input.sleeveLength}.` : 'Maintain appropriate sleeves for the style.'}
            5. ZERO CLOTHING BLEED: Ensure 100% removal of original clothes.
          `;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN ELITE VIRTUAL STYLIST. 
            
            TASK: COMPLETELY RE-DRESS the person in the first photo using the garment/material shown in the second photo ("${input.productTitle}"). 
            
            ${styleInstructions}

            CRITICAL CONSTRAINTS:
            - FACIAL INTEGRITY: Keep the person's face and features exactly as they are.
            - REALISM: The final output must look like a high-resolution professional photograph.
            - CLEANLINESS: The person's original clothes must be totally invisible.
            
            Return ONLY the final processed image.` 
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
