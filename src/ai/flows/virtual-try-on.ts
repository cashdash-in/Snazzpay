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
  generatedImageDataUri: z.string().optional().describe('The processed image with the product tried on.'),
  error: z.string().optional().describe('Error message if the process failed.'),
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
      console.log(`[Magic Mirror] Processing try-on for: ${input.productTitle}`);
      
      const title = input.productTitle.toLowerCase();
      const isWatch = title.includes('watch');
      const isShoes = title.includes('shoe') || title.includes('sandal') || title.includes('sneaker') || title.includes('footwear');
      const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle');
      
      let styleInstructions = '';

      if (isWatch) {
          styleInstructions = 'MODE: ACCESSORY FITTING (WATCH). Fit the watch from the second photo onto the user\'s wrist shown in the first photo. Match angle and shadows.';
      } else if (isShoes) {
          styleInstructions = 'MODE: FOOTWEAR FITTING. Re-dress the user\'s feet in the first photo with the shoes from the second photo.';
      } else if (isEyewear) {
          styleInstructions = 'MODE: EYEWEAR FITTING. Place the glasses from the second photo onto the user\'s face in the first photo.';
      } else if (input.drapeStyle === 'East Indian Lugra') {
          styleInstructions = 'MODE: AUTHENTIC EAST INDIAN LUGRA. Drape the fabric from the second photo over the left shoulder. Add traditional East Indian jewelry.';
      } else if (input.drapeStyle === 'Standard Saree') {
          styleInstructions = 'MODE: STANDARD NIVI SAREE. Floor-length drape with matching blouse from the provided fabric.';
      } else {
          styleInstructions = `STYLING MODE: ${input.drapeStyle || 'Western'}. Silhouette: ${input.garmentType}. Sleeves: ${input.sleeveLength || 'Standard'}.`;
      }

      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri, contentType: 'image/jpeg' } },
          { media: { url: input.productImageDataUri, contentType: 'image/jpeg' } },
          { 
            text: `ACT AS AN ELITE VIRTUAL STYLIST. TASK: RE-DRESS or ACCESSORIZE the person in the first photo using the item shown in the second photo ("${input.productTitle}"). ${styleInstructions} CRITICAL: Keep person's face/features exactly. Return ONLY the final image.` 
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ]
        },
      });

      if (!media?.url) {
          return { error: 'AI processed the request but did not return an image. The product may have triggered a safety filter.' };
      }

      return { generatedImageDataUri: media.url };
    } catch (err: any) {
      console.error("[Magic Mirror Flow] Service Error:", err);
      return { error: `AI Service Error: ${err.message || 'The model is temporarily busy. Please try again in a few moments.'}` };
    }
  }
);

export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}