'use server';
/**
 * @fileOverview AI Flow to generate a complete e-commerce store configuration from a prompt.
 */
import { ai } from '@/ai/genkit';
import {
  SiteBuilderInputSchema,
  SiteBuilderOutputSchema,
  type SiteBuilderInput,
  type SiteBuilderOutput,
} from '@/ai/schemas/site-builder';

const prompt = ai.definePrompt({
  name: 'siteBuilderPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: SiteBuilderInputSchema },
  output: { schema: SiteBuilderOutputSchema },
  prompt: `You are an elite E-commerce Consultant and Web Designer. 
    A client wants to start a new online store based on this prompt: "{{{prompt}}}"
    
    Generate a complete brand identity and initial inventory for them.
    - Store Name: Professional and memorable.
    - Slogan: Catchy.
    - Theme Color: A hex code representing the brand.
    - Welcome Message: A friendly greeting for their store's AI assistant.
    - Suggested Products: Create 4 realistic products that would sell well in this niche. Include descriptions and logical pricing in INR.
    
    Return the response in JSON format.`,
});

export const generateSiteConfig = ai.defineFlow(
  {
    name: 'generateSiteConfig',
    inputSchema: SiteBuilderInputSchema,
    outputSchema: SiteBuilderOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("Failed to generate site configuration.");
    return output;
  }
);

export async function startSiteBuilder(input: SiteBuilderInput): Promise<SiteBuilderOutput> {
  return generateSiteConfig(input);
}
