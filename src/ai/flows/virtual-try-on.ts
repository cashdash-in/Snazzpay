
'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VirtualTryOnInputSchema = z.object({
  personImageDataUri: z
    .string()
    .describe(
      "A photo of the customer, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productImageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productTitle: z.string().describe('The name of the product (e.g., Silk Saree).'),
});

const VirtualTryOnOutputSchema = z.object({
  generatedImageDataUri: z.string().describe('The result of the virtual try-on.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;
export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async (input) => {
    try {
      console.log(`Starting Virtual Try-On for: ${input.productTitle}`);
      
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST. 
            TASK: Take the person from the first image and VIRTUALLY DRESS them in the "${input.productTitle}" shown in the second image. 
            
            GUIDELINES:
            1. PERSERVE IDENTITY: Keep the person's face, hair, and basic body structure exactly the same.
            2. REALISTIC FIT: Drape the clothing item (e.g. saree, shirt) realistically over their body.
            3. CONSISTENCY: Keep the background and lighting of the first image.
            4. QUALITY: The output should look like a professional photograph of them wearing the item.
            
            DO NOT add any text overlays. Return ONLY the edited image.` 
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const mediaPart = response.output?.message?.content.find((p) => !!p.media);
      
      if (!mediaPart || !mediaPart.media?.url) {
        throw new Error('The AI model completed but did not return a generated image.');
      }

      console.log('Virtual Try-On successful.');
      return { generatedImageDataUri: mediaPart.media.url };
    } catch (error: any) {
      console.error("Virtual Try-On Error Details:", error);
      throw new Error(`Try-on failed: ${error.message || 'The AI service is currently overloaded. Please try again with a smaller photo.'}`);
    }
  }
);
