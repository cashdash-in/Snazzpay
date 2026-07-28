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

const videoFlow = ai.defineFlow(
  {
    name: 'videoAdFlow',
    inputSchema: VideoAdInputSchema,
    outputSchema: z.object({
        videoUrl: z.string().describe('Data URI of the generated MP4 video')
    }),
  },
  async (input) => {
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
      throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes (polling)
    let maxRetries = 24; // ~2 minutes max
    while (!operation.done && maxRetries > 0) {
      operation = await ai.checkOperation(operation);
      if (!operation.done) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          maxRetries--;
      }
    }

    if (maxRetries === 0) {
        throw new Error('Video generation timed out. Please try again.');
    }

    if (operation.error) {
      throw new Error('Failed to generate video: ' + operation.error.message);
    }

    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media?.url) {
      throw new Error('Failed to find the generated video content');
    }

    // Since we can't easily return a signed direct URL from a server action without more plumbing,
    // we fetch it and return as a data URI if possible, or just the URL if accessible.
    // For this prototype, we'll try to proxy the fetch to include the API key as required by Veo.
    const fetchUrl = `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`;
    
    try {
        const response = await fetch(fetchUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return { videoUrl: `data:video/mp4;base64,${base64}` };
    } catch (e) {
        // Fallback to direct URL if base64 conversion fails
        return { videoUrl: fetchUrl };
    }
  }
);

/**
 * Server action to generate a video ad.
 */
export async function createVideoAd(input: VideoAdInput) {
    return videoFlow(input);
}
