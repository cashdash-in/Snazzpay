'use server';
/**
 * @fileOverview AI Flow to generate platform-specific social media ad copy and metadata.
 * 
 * - createSocialAd: Server action wrapper for the generation flow.
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
  prompt: `You are an elite Digital Marketing Strategist and Viral Content Creator. 
    
    TASK:
    Generate a complete "Social Media Posting Kit" for the following product. 
    The goal is to drive orders via "Secure COD".
    
    PRODUCT DETAILS:
    - Title: {{{productTitle}}}
    - Price: INR {{{price}}}
    - Description: {{{productDescription}}}
    - Brand: {{{brandName}}}
    
    STRATEGY REQUIREMENTS:
    - Instagram: Focus on aesthetic lifestyle storytelling and "FOMO".
    - Facebook: Focus on trust, detailed value proposition, and community sharing.
    - Pinterest: Focus on inspiration, visual search keywords, and long-term discoverability.
    - YouTube: Focus on high-energy hooks and clear audio-visual instructions.
    
    SPECIFIC KIT REQUIREMENTS:
    - Always provide at least 10 trending hashtags/tags for each platform.
    - Include a "Posting Tip" based on current 2024 social media algorithms.
    - Headline: Max 5 words, high-impact.
    - CTAs: Must mention "Secure COD" and "No Advance Payment needed - pay on dispatch".
    
    Return a valid JSON object following the schema precisely.`,
});

const generateSocialAdFlow = ai.defineFlow(
  {
    name: 'generateSocialAdFlow',
    inputSchema: SocialAdInputSchema,
    outputSchema: SocialAdOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await prompt(input);
      if (!output) throw new Error("AI failed to produce a valid marketing kit.");
      return output;
    } catch (error: any) {
      console.error("Genkit socialAdPrompt error:", error);
      throw new Error(`Generation error: ${error.message}`);
    }
  }
);

/**
 * Generates a complete platform-specific social ad posting kit.
 * This is a Server Action.
 */
export async function createSocialAd(input: SocialAdInput): Promise<SocialAdOutput> {
    return generateSocialAdFlow(input);
}
