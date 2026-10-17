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
  garmentType: z.enum(['Shirt', 'Fabric', 'Kurti', 'Dress']).default('Fabric').describe('Classification of the source garment.'),
  drapeStyle: z.enum(['Standard Saree', 'East Indian Lugra', 'Western Wear', 'Western Dress', 'Kurti']).optional().describe('The specific style requested by the user.'),
  sleeveLength: z.enum(['Half Sleeves', 'Full Sleeves', 'Sleeveless']).optional().describe('Preferred sleeve length for the garment.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput) {
  try {
      console.log(`[Magic Mirror] Processing try-on for: ${input.productTitle} | Type: ${input.garmentType} | Style: ${input.drapeStyle || 'Auto'}`);
      
      const isLugraStyle = input.drapeStyle === 'East Indian Lugra';
      const isSareeStyle = input.drapeStyle === 'Standard Saree';
      const isKurtiStyle = input.drapeStyle === 'Kurti' || input.garmentType === 'Kurti';
      const isDressStyle = input.drapeStyle === 'Western Dress' || input.garmentType === 'Dress';
      const isShirt = input.garmentType === 'Shirt';

      let styleInstructions = '';

      if (isLugraStyle) {
          styleInstructions = `
            STYLING MODE: AUTHENTIC EAST INDIAN LUGRA (GAOTHAN VILLAGE PATTERN)
            CRITICAL STYLE CONSTRAINT: Match the specific drape and accessory style of a traditional East Indian lady (Gaothan aesthetic).
            
            MANDATORY TRADITIONAL REQUIREMENTS:
            1. DRAPE: Apply the traditional "Lugra" drape. The pallu should be draped elegantly over the left shoulder. The drape should be ankle-length (showing the ankles).
            2. WAIST: The drape is tucked neatly at the waist with prominent gathered pleats. STRICTLY FORBIDDEN: Do not add any waist belt or Kamar Pata.
            3. BLOUSE: Generate a matching blouse (matching the fabric in the second photo) with traditional sleeves ending at the elbow with zari borders.
            4. ACCESSORIES: Automatically add ONLY these authentic gold jewelry items:
               - "East Indian Pote": A long traditional gold bead necklace with a distinct pendant reaching the NAVEL AREA exactly.
               - Layered Necklaces: Include a gold choker and a medium-length gold necklace.
               - "Bangadi": A stack of thick gold bangles on BOTH wrists.
               - STRICTLY FORBIDDEN: Do not add any South Indian temple jewelry or modern heavy long necklaces.
            5. HAIR & FACE: 
               - Style the hair into a neat bun with a gajra (flower garland).
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
            2. SILHOUETTE: Maintain the Kurti's authentic long tunic silhouette.
            3. SLEEVES: ${input.sleeveLength ? `Modify the garment to have ${input.sleeveLength}.` : 'Maintain original garment sleeves.'}
            4. ZERO CLOTHING BLEED: Ensure 100% removal of original tops.
          `;
      } else if (isDressStyle) {
          styleInstructions = `
            STYLING MODE: WESTERN DRESS FIT
            1. TASK: Re-dress the person in the one-piece dress shown in the product photo.
            2. SILHOUETTE: Follow the flow and cut of the dress perfectly (e.g., bodycon, flared, or maxi).
            3. SLEEVES: ${input.sleeveLength ? `Modify the garment to have ${input.sleeveLength}.` : 'Maintain original garment sleeves.'}
          `;
      } else if (isShirt) {
          styleInstructions = `
            STYLING MODE: SHIRT/T-SHIRT STANDARD FITTING
            1. TASK: COMPLETELY RE-DRESS the person using the shirt/t-shirt from the second photo.
            2. SILHOUETTE: Ensure the entire garment is visible and fits the torso perfectly. It must look like a high-end commercial fashion photograph.
            3. NO TRANSFORMATION: Do NOT turn this shirt into a dress or skirt. Maintain its original form as a top.
            4. SLEEVES: ${input.sleeveLength ? `Force the garment to have ${input.sleeveLength}.` : 'Maintain original sleeves.'}
          `;
      } else {
          // Western Wear mode for Fabrics (Saree/Lugra material)
          styleInstructions = `
            STYLING MODE: MODERN WESTERN TRANSFORMATION
            1. TASK: TRANSFORM the fabric/material from the second photo ("${input.productTitle}") into a modern WESTERN OUTFIT. 
            2. SPECIFIC CUT: Generate a TIGHT-FITTING MINI SKIRT or BODYCON MIDI SKIRT and a matching TIGHT-FITTING MODERN CROP TOP.
            3. SILHOUETTE: Ensure a trendy, boutique western look. Do NOT drape it like a saree.
            4. SLEEVES: ${input.sleeveLength ? `Force the top to have ${input.sleeveLength}.` : 'Generate matching stylish sleeves.'}
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
