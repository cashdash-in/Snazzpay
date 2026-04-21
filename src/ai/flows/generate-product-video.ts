'use server';
/**
 * @fileOverview An AI flow to generate a short video clip from product information.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { Readable } from 'stream';
import type { MediaPart } from 'genkit';

const GenerateProductVideoInputSchema = z.object({
  title: z.string().describe('The product title.'),
  description: z.string().describe('The product description.'),
  imageDataUri: z.string().describe("A photo of the product, as a data URI."),
});

export type GenerateProductVideoInput = z.infer<typeof GenerateProductVideoInputSchema>;

const GenerateProductVideoOutputSchema = z.object({
    videoDataUri: z.string().describe("The generated video as a data URI.")
});
export type GenerateProductVideoOutput = z.infer<typeof GenerateProductVideoOutputSchema>;

// Helper function to download video from the temporary URL provided by Veo
async function downloadVideo(video: MediaPart): Promise<string> {
    if (!video.media?.url) {
        throw new Error('Video URL not found in media part');
    }
    // The URL from Veo doesn't include the API key, so we need to add it.
    const videoDownloadUrl = `${video.media.url}&key=${process.env.GEMINI_API_KEY}`;
  
    const videoDownloadResponse = await fetch(videoDownloadUrl);
    
    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        const errorBody = await videoDownloadResponse.text();
        throw new Error(`Failed to download video: ${videoDownloadResponse.status} ${videoDownloadResponse.statusText} - ${errorBody}`);
    }

    const videoBuffer = Buffer.from(await videoDownloadResponse.arrayBuffer());
    const base64Video = videoBuffer.toString('base64');
    
    return `data:video/mp4;base64,${base64Video}`;
}

const generateProductVideoFlow = ai.defineFlow(
  {
    name: 'generateProductVideoFlow',
    inputSchema: GenerateProductVideoInputSchema,
    outputSchema: GenerateProductVideoOutputSchema,
  },
  async (input) => {
    
    const prompt = `Generate a short, cinematic 5-second video clip for a product titled "${input.title}". The description is: "${input.description}". Make the product image come to life.`;

    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: [
        { text: prompt },
        { media: { url: input.imageDataUri } },
      ],
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    });

    if (!operation) {
      throw new Error('Expected the model to return an operation for video generation.');
    }

    // Poll for completion
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video) {
      throw new Error('Failed to find the generated video in the operation result.');
    }

    const videoDataUri = await downloadVideo(video);

    return { videoDataUri };
  }
);

export async function generateProductVideo(
  input: GenerateProductVideoInput
): Promise<GenerateProductVideoOutput> {
  return generateProductVideoFlow(input);
}
