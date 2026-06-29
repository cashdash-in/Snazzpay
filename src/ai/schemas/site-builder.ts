
import { z } from 'genkit';

export const GeneratedProductSchema = z.object({
  id: z.string().optional().describe('Unique ID for the product'),
  title: z.string().describe('Catchy product name'),
  description: z.string().describe('Compelling product description'),
  price: z.number().describe('Suggested retail price in INR'),
  category: z.string().describe('Product category'),
});

export const SiteBuilderOutputSchema = z.object({
  storeName: z.string().describe('A creative name for the store'),
  slogan: z.string().describe('A catchy slogan'),
  themeColor: z.string().describe('A hex color code for primary branding'),
  accentColor: z.string().describe('A secondary hex color code'),
  welcomeMessage: z.string().describe('AI assistant greeting'),
  aiPersona: z.string().describe('AI assistant personality description'),
  suggestedProducts: z.array(GeneratedProductSchema).describe('List of 4-6 initial products'),
});

export const SiteBuilderInputSchema = z.object({
  prompt: z.string().describe('User request for the site'),
  currentConfig: SiteBuilderOutputSchema.optional().describe('Current site configuration if updating'),
});

export type SiteBuilderInput = z.infer<typeof SiteBuilderInputSchema>;
export type SiteBuilderOutput = z.infer<typeof SiteBuilderOutputSchema>;
