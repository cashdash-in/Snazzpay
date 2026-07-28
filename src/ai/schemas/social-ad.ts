
import { z } from 'genkit';

export const StoryboardSlideSchema = z.object({
  headline: z.string().describe('Short, punchy headline for this slide'),
  visualDescription: z.string().describe('Description of the visual style or scene for this part of the ad'),
  subtext: z.string().describe('Supporting text or price callout'),
});

export const SocialAdInputSchema = z.object({
  productTitle: z.string().describe('The name of the product'),
  productDescription: z.string().describe('The base description of the product'),
  price: z.number().describe('The selling price of the product'),
  brandName: z.string().optional().describe('The name of the store or brand'),
});

export const SocialAdOutputSchema = z.object({
  storyHeadline: z.string().describe('A short, powerful emotional headline for the main ad'),
  videoScript: z.object({
    hook: z.string().describe('0-5s: The opening line to grab attention'),
    body: z.string().describe('5-25s: The story and value proposition'),
    cta: z.string().describe('25-30s: The closing call to action focusing on Secure COD'),
    musicStyle: z.string().describe('Recommended music genre and mood'),
  }).describe('A professional script for a 30-second video/reel'),
  storyboard: z.array(StoryboardSlideSchema).length(3).describe('A 3-part visual storyboard for a carousel or video'),
  platforms: z.object({
    instagram: z.object({
      caption: z.string().describe('A storytelling caption for Instagram with emojis'),
      hashtags: z.array(z.string()).describe('Relevant viral hashtags'),
      postingTip: z.string().describe('Specific tip for Instagram Reels'),
    }),
    facebook: z.object({
      postBody: z.string().describe('A persuasive, detail-oriented post for Facebook'),
      headline: z.string().describe('A catchy headline for the FB ad'),
      callToAction: z.string().describe('Recommended CTA button text'),
    }),
    pinterest: z.object({
      title: z.string().describe('An aesthetic title for a Pinterest pin'),
      description: z.string().describe('A descriptive, SEO-friendly pin description'),
      keywords: z.array(z.string()).describe('High-traffic Pinterest keywords'),
    }),
  }),
});

export type SocialAdInput = z.infer<typeof SocialAdInputSchema>;
export type SocialAdOutput = z.infer<typeof SocialAdOutputSchema>;
