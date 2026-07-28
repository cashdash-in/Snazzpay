'use server';
/**
 * @fileOverview AI flow to generate cinematic video ads using Veo models.
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

const videoFlow = ai.defineFlow(
  {
    name: 'videoAdFlow',
    inputSchema: VideoAdInputSchema,
    outputSchema: z.object({
        videoUrl: z.string().describe('URL or Proxy URL of the generated video'),
        error: z.string().optional()
    }),
  },
  async (input) => {
    try {
        const prompt = `Create a cinematic, high-end professional commercial for "${input.productTitle}". 
        The mood should be ${input.mood || 'Luxurious and Cinematic'}. 
        Highlight these details: ${input.productDescription}. 
        The subject in the attached photo should move gracefully and be the center of attention.`;

        // Switch to veo-2.0-generate-001 as 3.0 preview is returning 404 (restricted access)
        // Veo 2 is the current stable generation model.
        let { operation } = await ai.generate({
          model: googleAI.model('veo-2.0-generate-001'),
          prompt: [
            { text: prompt },
            { media: { url: input.imageDataUri } }
          ],
          config: {
            numberOfVideos: 1,
            personGeneration: 'allow_adult',
            durationSeconds: 5,
            aspectRatio: '9:16', // Vertical for social media ads (Instagram/TikTok)
          },
        });

        if (!operation) {
          throw new Error('The video generation model did not return a valid task. Please try again.');
        }

        // Poll for completion (max 2 minutes)
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

        // Return a link to our internal proxy which adds the API key securely.
        const rawUrl = videoPart.media.url;
        return { videoUrl: `/api/proxy-video?url=${encodeURIComponent(rawUrl)}` };
        
    } catch (error: any) {
        console.error("createVideoAd main error:", error);
        return { videoUrl: '', error: error.message || "An unexpected error occurred during video production." };
    }
  }
);

/**
 * Server action to generate a video ad.
 */
export async function createVideoAd(input: VideoAdInput) {
    return videoFlow(input);
}
