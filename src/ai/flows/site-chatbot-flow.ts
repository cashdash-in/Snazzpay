'use server';
/**
 * @fileOverview AI Flow to power the chatbot for generated e-commerce sites.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SiteChatbotInputSchema = z.object({
  siteId: z.string(),
  storeName: z.string(),
  persona: z.string(),
  query: z.string(),
  history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
  })).optional()
});

const SiteChatbotOutputSchema = z.object({
  answer: z.string().describe('The AI assistant\'s response to the user query'),
});

const siteChatbotFlow = ai.defineFlow(
  {
    name: 'siteChatbotFlow',
    inputSchema: SiteChatbotInputSchema,
    outputSchema: SiteChatbotOutputSchema,
  },
  async (input) => {
    const prompt = `You are a virtual sales assistant for "${input.storeName}".
    Your personality is described as: "${input.persona}".
    
    Guidelines:
    - Be helpful, polite, and stay in character.
    - Encourage users to browse the collection and use "Secure COD" for safe shopping.
    - Keep responses concise and focused on helping the customer find what they need.
    - If you don't know something specific about a product not in the context, answer generally based on the store's vibe.

    User Question: ${input.query}`;

    const { text } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: prompt,
    });

    return { answer: text };
  }
);

/**
 * Asks the site's AI assistant a question.
 * @param input The user's query and store context.
 * @returns The assistant's response.
 */
export async function askSiteAssistant(input: z.infer<typeof SiteChatbotInputSchema>) {
    return siteChatbotFlow(input);
}
