
'use server';
/**
 * @fileOverview AI Flow to generate or update a complete e-commerce store configuration.
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
  prompt: `You are an elite E-commerce Architect. 
    
    TASK:
    {{#if currentConfig}}
    Update the following site configuration based on the user's request.
    Current Config: {{json currentConfig}}
    User Request: "{{{prompt}}}"
    {{else}}
    Generate a complete new brand identity and initial inventory based on this prompt: "{{{prompt}}}"
    {{/if}}
    
    REQUIREMENTS:
    - Store Name: Professional and memorable.
    - Slogan: Catchy and brand-aligned.
    - Theme Color: A primary hex code.
    - Accent Color: A matching secondary hex code.
    - Welcome Message: A personalized greeting for the store's AI assistant.
    - AI Persona: Detailed personality for the chatbot.
    - Suggested Products: 4-6 realistic products.
    
    If updating, only change the fields requested while keeping others consistent.
    Return a valid JSON object.`,
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
