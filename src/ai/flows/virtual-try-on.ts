'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 *
 * - virtualTryOn - A function that handles the try-on process.
 * - VirtualTryOnInput - The input type for the virtualTryOn function.
 * - VirtualTryOnOutput - The return type for the virtualTryOn function.
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
  garmentType: z.enum(['Shirt', 'Fabric', 'Kurti', 'Dress', 'Accessory', 'Footwear']).default('Fabric').describe('Classification of the source garment.'),
  drapeStyle: z.enum(['Standard Saree', 'East Indian Lugra', 'Western Wear', 'Western Dress', 'Kurti']).optional().describe('The specific style requested by the user.'),
  sleeveLength: z.enum(['Half Sleeves', 'Full Sleeves', 'Sleeveless']).optional().describe('Preferred sleeve length for the garment.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

export const VirtualTryOnOutputSchema = z.object({
  generatedImageDataUri: z.string().describe('The processed image with the product tried on.'),
});

export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async (input) => {
    try {
      console.log(`[Magic Mirror] Processing try-on flow for: ${input.productTitle}`);
      
      const title = input.productTitle.toLowerCase();
      const isWatch = title.includes('watch');
      const isShoes = title.includes('shoe') || title.includes('sandal') || title.includes('sneaker') || title.includes('footwear') || title.includes('bondi') || title.includes('clifton') || title.includes('hoka');
      const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle');
      
      const isLugraStyle = input.drapeStyle === 'East Indian Lugra';
      const isSareeStyle = input.drapeStyle === 'Standard Saree';
      const isKurtiStyle = input.drapeStyle === 'Kurti' || input.garmentType === 'Kurti';
      const isDressStyle = input.drapeStyle === 'Western Dress' || input.garmentType === 'Dress';
      const isShirt = input.garmentType === 'Shirt';

      let styleInstructions = '';

      if (isWatch) {
          styleInstructions = `
            MODE: ACCESSORY FITTING (WATCH)
            TASK: Fit the watch from the second photo onto the user's wrist shown in the first photo.
            CONSTRAINTS: Match watch face angle to wrist orientation. Add subtle shadows.
          `;
      } else if (isShoes) {
          styleInstructions = `
            MODE: FOOTWEAR FITTING
            TASK: Re-dress the user's feet in the first photo with the shoes shown in the second photo.
            CONSTRAINTS: Ensure the shoes fit perfectly on the feet. Match lighting.
          `;
      } else if (isEyewear) {
          styleInstructions = `
            MODE: EYEWEAR FITTING
            TASK: Place the glasses from the second photo onto the user's face in the first photo.
          `;
      } else if (isLugraStyle) {
          styleInstructions = `
            STYLING MODE: AUTHENTIC EAST INDIAN LUGRA (GAOTHAN VILLAGE PATTERN)
            DRAPE: Traditional "Lugra" drape over the left shoulder. Ankle-length.
            BLOUSE: Matching fabric from second photo with zari borders.
            ACCESSORIES: Add "East Indian Pote" necklace reaching navel, gold choker, and "Bangadi" bangles.
            HAIR: Style into neat bun with gajra. Clean forehead.
          `;
      } else if (isSareeStyle) {
          styleInstructions = `
            STYLING MODE: STANDARD NIVI SAREE
            DRAPE: Floor-length Nivi drape. Matching blouse. Simple gold jewelry.
          `;
      } else if (isKurtiStyle) {
          styleInstructions = `
            STYLING MODE: TRADITIONAL KURTI FIT
            SILHOUETTE: Authentic long tunic. Remove original top completely.
          `;
      } else if (isDressStyle) {
          styleInstructions = `
            STYLING MODE: WESTERN DRESS FIT
            SILHOUETTE: Follow the cut of the dress (bodycon/flared/maxi).
          `;
      } else if (isShirt) {
          styleInstructions = `
            STYLING MODE: SHIRT FITTING
            SILHOUETTE: Torso fitting. No transformation into dress.
          `;
      } else {
          styleInstructions = `
            STYLING MODE: MODERN WESTERN TRANSFORMATION
            TASK: Transform material into tight-fitting mini skirt and crop top.
          `;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN ELITE VIRTUAL STYLIST. 
            TASK: COMPLETELY RE-DRESS or ACCESSORIZE the person in the first photo using the item shown in the second photo ("${input.productTitle}"). 
            ${styleInstructions}
            CRITICAL CONSTRAINTS: Keep person's face/features exactly. Look high-res and professional.
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
      console.error("[Magic Mirror Flow] Service Error:", err);
      throw new Error(`Try-on service error: ${err.message || 'The AI service is temporarily busy.'}`);
    }
  }
);

/**
 * Server Action wrapper for the virtual try-on flow.
 */
export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}
