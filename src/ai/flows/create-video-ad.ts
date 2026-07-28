'use server';
/**
 * @fileOverview AI flow to generate cinematic video ads with sound using Veo models.
 * 
 * - createVideoAd: Generates a 5-8 second video ad based on product details and mood.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const VideoAdInputSchema = z.object({
  productTitle: z.string().describe('The name of the product'),
  productDescription: z.string().describe('Base description of the product'),
  mood: z.string().optional().describe('Desired mood for the video (e.g., Cinematic, Energetic)'),
  imageDataUri: z.string().describe('A reference image of the product to use as the starting point.'),
});

export type VideoAdInput = z.infer<typeof VideoAdInputSchema>;

// Increase timeout for this specific server action file to 2 minutes
export const maxDuration = 120;

const videoFlow = ai.defineFlow(
  {
    name: 'videoAdFlow',
    inputSchema: VideoAdInputSchema,
    outputSchema: z.object({
        videoUrl: z.string().describe('Data URI of the generated MP4 video'),
        error: z.string().optional()
    }),
  },
  async (input) => {
    try {
        const prompt = `Create a cinematic, high-end professional commercial for "${input.productTitle}". 
        The mood should be ${input.mood || 'Luxurious and Cinematic'}. 
        Highlight these details: ${input.productDescription}. 
        Include high-quality atmospheric background music and professional sound effects matching the movement.
        The subject in the attached photo should move gracefully and be the center of attention.`;

        let { operation } = await ai.generate({
          model: googleAI.model('veo-3.0-generate-preview'),
          prompt: [
            { text: prompt },
            { media: { url: input.imageDataUri } }
          ],
          config: {
            numberOfVideos: 1,
            personGeneration: 'allow_all',
          },
        });

        if (!operation) {
          throw new Error('The video generation model did not return a valid task. Please try again.');
        }

        // Wait until the operation completes (polling)
        // We poll every 5 seconds for a maximum of 24 times (~2 minutes)
        let maxRetries = 24; 
        while (!operation.done && maxRetries > 0) {
          operation = await ai.checkOperation(operation);
          if (!operation.done) {
              await new Promise((resolve) => setTimeout(resolve, 5000));
              maxRetries--;
          }
        }

        if (maxRetries === 0) {
            throw new Error('Video generation timed out. High-quality AI video can take up to 2 minutes.');
        }

        if (operation.error) {
          throw new Error(`AI Director Error: ${operation.error.message}`);
        }

        const videoPart = operation.output?.message?.content.find((p) => !!p.media);
        if (!videoPart || !videoPart.media?.url) {
          throw new Error('The AI generated the video but the content could not be retrieved.');
        }

        // Add API key for direct access as per Veo requirements
        const fetchUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
        
        try {
            // Proxy the fetch to return a stable Data URI to the client
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error("Could not download generated video file.");
            
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return { videoUrl: `data:video/mp4;base64,${base64}` };
        } catch (e: any) {
            console.error("Video proxy fetch failed:", e);
            // Fallback to direct URL if base64 conversion fails
            return { videoUrl: fetchUrl };
        }
    } catch (error: any) {
        console.error("createVideoAd main error:", error);
        throw new Error(error.message || "An unexpected error occurred during video production.");
    }
  }
);

/**
 * Server action to generate a video ad.
 */
export async function createVideoAd(input: VideoAdInput) {
    return videoFlow(input);
}
