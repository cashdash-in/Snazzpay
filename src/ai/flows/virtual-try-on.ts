'use server';
/**
 * @fileOverview AI flow for Virtual Try-On (Magic Mirror).
 * Uses Gemini 2.5 Flash Image to blend a product onto a customer's photo.
 * This flow is optimized for reliability and realistic garment draping.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VirtualTryOnInputSchema = z.object({
  personImageDataUri: z
    .string()
    .describe(
      "A photo of the customer, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productImageDataUri: z
    .string()
    .describe(
      "A photo of the product, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  productTitle: z.string().describe('The name of the product (e.g., Silk Saree).'),
});

const VirtualTryOnOutputSchema = z.object({
  generatedImageDataUri: z.string().describe('The result of the virtual try-on.'),
});

export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;
export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

const tryOnPrompt = ai.definePrompt({
  name: 'virtualTryOnPrompt',
  model: 'googleai/gemini-2.5-flash-image',
  input: { schema: VirtualTryOnInputSchema },
  output: { schema: VirtualTryOnOutputSchema },
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
  prompt: `ACT AS AN EXPERT VIRTUAL STYLIST. 
    
    TASK: 
    1. Look at the person in the first image: {{media url=personImageDataUri}}
    2. Look at the clothing item in the second image: {{media url=productImageDataUri}}
    3. Virtually dress the person in the "{{{productTitle}}}".
    
    CRITICAL GUIDELINES:
    - IDENTITY PRESERVATION: Do not change the person's face, hair, or skin tone.
    - REALISTIC FIT: Drape the fabric (especially for sarees or loose garments) realistically over the person's body structure shown in the first image.
    - SEAMLESS BLENDING: Maintain the background and lighting of the person's original photo.
    - QUALITY: The output should be a professional-looking photograph.
    
    Do not add text overlays. Return ONLY the edited image.`,
});

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async (input) => {
    try {
      console.log(`[Virtual Try-On] Starting processing for: ${input.productTitle}`);
      const response = await tryOnPrompt(input);
      
      const mediaPart = response.output?.generatedImageDataUri;
      
      if (!mediaPart) {
          // Fallback check if prompt helper didn't extract media URL correctly
          // Sometimes media is in response.media or raw output
          throw new Error('AI processed but did not return image data.');
      }

      return { generatedImageDataUri: mediaPart };
    } catch (error: any) {
      console.error("[Virtual Try-On] Error:", error);
      throw new Error(`Try-on service error: ${error.message}`);
    }
  }
);

export async function virtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  // Directly call the definePrompt for image-to-image modal results
  // as Flash Image models behave better with direct generate in some environments
  try {
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: [
          { media: { url: input.personImageDataUri } },
          { media: { url: input.productImageDataUri } },
          { 
            text: `ACT AS AN EXPERT VIRTUAL STYLIST. 
            VIRTUALLY DRESS the person in the first photo in the exact "${input.productTitle}" shown in the second photo. 
            Keep the person's face and the original background exactly the same. 
            Return ONLY the final image.` 
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const mediaPart = response.output?.message?.content.find((p) => !!p.media);
      if (!mediaPart?.media?.url) throw new Error("No image generated");
      
      return { generatedImageDataUri: mediaPart.media.url };
  } catch (err: any) {
      console.error("AI Generation failed:", err);
      throw err;
  }
}
