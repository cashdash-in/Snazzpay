
'use server';

/**
 * @fileOverview A flow for creating an animated explainer video for the Snazzify ordering process.
 *
 * - createExplainerVideo - A function that generates the video.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
const fetch = (...args: Parameters<typeof import('node-fetch').then>) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Helper function to convert a stream to a base64 string
async function streamToB64(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
        stream.on('error', err => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    });
}


export async function createExplainerVideo(): Promise<{ videoDataUri: string }> {
    console.log("Starting video generation flow...");

    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: `Create a cinematic, high-quality 3D animated explainer video for an e-commerce brand named 'Snazzify'. The animation style should be modern, clean, and friendly, using a color palette of deep indigo, soft purples, and white.

        The video should have the following scenes:

        Scene 1: A cheerful character is happily shopping on their phone. A product is added to a cart with a 'Buy with Secure COD' button prominently displayed.

        Scene 2: The character confidently clicks the 'Buy with Secure COD' button. A graphic overlay shows a credit card icon turning into a secure shield icon, which then flies into a digital wallet icon labeled 'Snazzify Trust Wallet'.

        Scene 3: Show the digital 'Snazzify Trust Wallet' glowing, with text appearing: "Your funds are held securely."

        Scene 4: Transition to a clean, modern warehouse. A package with the Snazzify logo is being packed and prepared for dispatch.

        Scene 5: The package is handed to a friendly courier. As the package is dispatched, an arrow animation shows the funds moving from the 'Snazzify Trust Wallet' to a 'Snazzify' account icon.

        Scene 6: The happy character receives the package at their door. No cash is exchanged with the courier, just a friendly wave.

        Scene 7: Final shot showing the Snazzify logo with the text: "Snazzify: Modern, Secure, Simple."
        `,
        config: {
            durationSeconds: 8,
            aspectRatio: '16:9',
        },
    });

    if (!operation) {
        throw new Error('Expected the model to return an operation');
    }

    console.log("Video generation operation started. Polling for completion...");

    // Wait until the operation completes.
    while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
        console.log("Checking operation status...");
        operation = await ai.checkOperation(operation);
    }

    if (operation.error) {
        console.error('Video generation failed:', operation.error);
        throw new Error('Failed to generate video: ' + operation.error.message);
    }

    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media?.url) {
        throw new Error('Failed to find the generated video in the operation result');
    }

    console.log("Video generated. Downloading content...");

    // The media URL is a GCS URL that needs to be fetched with an API key.
    const videoDownloadResponse = await fetch(
        `${video.media.url}&key=${process.env.GEMINI_API_KEY}`
    );

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download video file: ${videoDownloadResponse.statusText}`);
    }

    const videoBase64 = await streamToB64(videoDownloadResponse.body);
    const contentType = video.media.contentType || 'video/mp4';
    
    console.log("Video downloaded and encoded to Base64.");

    return {
        videoDataUri: `data:${contentType};base64,${videoBase64}`
    };
}
