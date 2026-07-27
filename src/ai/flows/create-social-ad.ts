
'use server';
/**
 * @fileOverview AI Flow to generate platform-specific social media ad copy.
 */
import { ai } from '@/ai/genkit';
import {
  SocialAdInputSchema,
  SocialAdOutputSchema,
  type SocialAdInput,
  type SocialAdOutput,
} from '@/ai/schemas/social-ad';

const prompt = ai.definePrompt({
  name: 'socialAdPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: SocialAdInputSchema },
  output: { schema: SocialAdOutputSchema },
  prompt: `You are an elite Digital Marketing Strategist. 
    
    TASK:
    Generate compelling, storytelling-driven ad copy for the following product across Instagram, Facebook, Pinterest, and YouTube.
    
    PRODUCT DETAILS:
    - Title: {{{productTitle}}}
    - Price: INR {{{price}}}
    - Description: {{{productDescription}}}
    - Brand: {{{brandName}}}
    
    REQUIREMENTS:
    - Storytelling: Don't just list features. Tell a story about how this product changes the customer's life or solves a problem.
    - Platforms: Adapt the tone for each platform (Aesthetic for Pinterest, Engaging for Instagram, Informative for Facebook, Punchy for YouTube).
    - Headline: Create a very short (max 5 words) powerful headline that will look good on an image.
    - CTAs: Always include a call to action to "Order via Secure COD".
    
    Return a valid JSON object.`,
});

const generateSocialAd = ai.defineFlow(
  {
    name: 'generateSocialAd',
    inputSchema: SocialAdInputSchema,
    outputSchema: SocialAdOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate ad copy.");
    return output;
  }
);

/**
 * Generates platform-specific ad copy for a product.
 * @param input The product details.
 * @returns The generated ad content.
 */
export async function createSocialAd(input: SocialAdInput): Promise<SocialAdOutput> {
    return generateSocialAd(input);
}
