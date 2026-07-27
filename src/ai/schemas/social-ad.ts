
import { z } from 'genkit';

export const SocialAdInputSchema = z.object({
  productTitle: z.string().describe('The name of the product'),
  productDescription: z.string().describe('The base description of the product'),
  price: z.number().describe('The selling price of the product'),
  brandName: z.string().optional().describe('The name of the store or brand'),
});

export const SocialAdOutputSchema = z.object({
  storyHeadline: z.string().describe('A short, powerful emotional headline for the ad image'),
  platforms: z.object({
    instagram: z.object({
      caption: z.string().describe('A storytelling caption for Instagram with emojis'),
      hashtags: z.array(z.string()).describe('Relevant viral hashtags'),
      bestTime: z.string().describe('Suggested time to post for maximum engagement'),
      postingTip: z.string().describe('Specific tip for Instagram (e.g., use a specific audio type)'),
    }),
    facebook: z.object({
      postBody: z.string().describe('A persuasive, detail-oriented post for Facebook'),
      headline: z.string().describe('A catchy headline for the FB ad'),
      callToAction: z.string().describe('Recommended CTA button text'),
      postingTip: z.string().describe('Tip for FB groups or ads manager'),
    }),
    pinterest: z.object({
      title: z.string().describe('An aesthetic title for a Pinterest pin'),
      description: z.string().describe('A descriptive, SEO-friendly pin description'),
      keywords: z.array(z.string()).describe('High-traffic Pinterest keywords'),
      postingTip: z.string().describe('Board organization or tagging tip'),
    }),
    youtube: z.object({
      videoScript: z.string().describe('A short 15-30 second script for a YouTube Short/Ad'),
      description: z.string().describe('Video description with CTAs'),
      tags: z.array(z.string()).describe('YouTube search tags'),
      postingTip: z.string().describe('Shorts vs long-form optimization tip'),
    }),
  }),
});

export type SocialAdInput = z.infer<typeof SocialAdInputSchema>;
export type SocialAdOutput = z.infer<typeof SocialAdOutputSchema>;
