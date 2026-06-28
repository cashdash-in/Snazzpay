import { z } from 'genkit';

export const SiteBuilderInputSchema = z.object({
  prompt: z.string().describe('The user\'s description of the online store they want to create.'),
});

export const GeneratedProductSchema = z.object({
  title: z.string().describe('Catchy product name'),
  description: z.string().describe('Compelling product description'),
  price: z.number().describe('Suggested retail price in INR'),
  category: z.string().describe('Product category'),
});

export const SiteBuilderOutputSchema = z.object({
  storeName: z.string().describe('A creative name for the store'),
  slogan: z.string().describe('A catchy slogan'),
  themeColor: z.string().describe('A hex color code that fits the brand vibe'),
  welcomeMessage: z.string().describe('A welcome message for the chatbot'),
  suggestedProducts: z.array(GeneratedProductSchema).describe('A list of 3-5 initial products to populate the store'),
});

export type SiteBuilderInput = z.infer<typeof SiteBuilderInputSchema>;
export type SiteBuilderOutput = z.infer<typeof SiteBuilderOutputSchema>;
