
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
  themeColor: z.string().describe('A hex color code that fits the brand vibe (e.g. #3b82f6 for blue, #ec4899 for pink)'),
  accentColor: z.string().describe('A secondary hex color code for buttons and highlights'),
  welcomeMessage: z.string().describe('A professional and friendly welcome message for the store assistant'),
  aiPersona: z.string().describe('A brief description of the AI assistant personality (e.g. "luxury consultant", "helpful gardener")'),
  suggestedProducts: z.array(GeneratedProductSchema).describe('A list of 4 initial products to populate the store'),
});

export type SiteBuilderInput = z.infer<typeof SiteBuilderInputSchema>;
export type SiteBuilderOutput = z.infer<typeof SiteBuilderOutputSchema>;

    