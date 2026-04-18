'use server';
/**
 * @fileOverview An AI flow to generate a magazine cover image.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const MagazineCoverInputSchema = z.object({
  imageUrls: z.array(z.string().url()).describe("A list of product image URLs to include in the collage."),
  title: z.string().describe("The title of the magazine to overlay on the cover."),
});
export type MagazineCoverInput = z.infer<typeof MagazineCoverInputSchema>;

export const MagazineCoverOutputSchema = z.object({
  coverImageDataUri: z.string().describe("The generated magazine cover image as a data URI."),
});
export type MagazineCoverOutput = z.infer<typeof MagazineCoverOutputSchema>;

export async function createMagazineCover(input: MagazineCoverInput): Promise<MagazineCoverOutput> {
  return createMagazineCoverFlow(input);
}

const createMagazineCoverFlow = ai.defineFlow(
  {
    name: 'createMagazineCoverFlow',
    inputSchema: MagazineCoverInputSchema,
    outputSchema: MagazineCoverOutputSchema,
  },
  async ({ imageUrls, title }) => {
    const primaryImageUrl = imageUrls[0];
    if (!primaryImageUrl) {
        throw new Error('At least one image URL is required to generate a cover.');
    }

    const mediaParts = [{ media: { url: primaryImageUrl } }];

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image',
      prompt: [
        { text: `Create a visually stunning and modern magazine cover titled "${title}". Use the following product image as the main subject, placing it artistically on a clean, fashionable background. The title should be prominent and stylish. The overall feel should be aspirational. Do not add any other text besides the title.` },
        ...mediaParts,
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to produce an image.');
    }

    return { coverImageDataUri: media.url };
  }
);
