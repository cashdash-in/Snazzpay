
'use server';
/**
 * @fileOverview AI Flow to generate platform-specific social media campaign kits.
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
  prompt: `You are an elite Creative Director and Viral Content Strategist. 
    
    TASK:
    Generate a complete "Cinematic Campaign Kit" for the following product. 
    The goal is to tell a story that makes the user WANT the lifestyle this product provides.
    
    PRODUCT DETAILS:
    - Title: {{{productTitle}}}
    - Price: INR {{{price}}}
    - Description: {{{productDescription}}}
    - Brand: {{{brandName}}}
    
    REQUIREMENTS:
    1. STORYBOARD: Create a 3-part visual storyboard (Intro/Hook, Value/Story, Outro/CTA).
    2. SCRIPT: Write a 30-second script for a Reel or Video Ad. Must mention "Secure COD - Pay only on dispatch" as a trust builder.
    3. MUSIC: Suggest a specific music style (e.g., "Lofi Chill with Upbeat Bass" or "Luxurious Cinematic Strings").
    4. PLATFORMS: Provide optimized captions and tags for Instagram, Facebook, and Pinterest.
    
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
