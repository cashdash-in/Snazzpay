
import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check for the API key and provide a clear error message if it's missing.
if (!process.env.GEMINI_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'The GEMINI_API_KEY environment variable is not set. Please add it to your hosting provider\'s environment variables.'
    );
  } else {
    // In development, we can be more descriptive.
    throw new Error(
      'The GEMINI_API_KEY environment variable is not set. Please add it to your .env file.'
    );
  }
}

// Define the plugins array.
const plugins: Plugin[] = [googleAI()];

export const ai = genkit({
  plugins: plugins,
  // The default model for general text generation tasks.
  model: 'googleai/gemini-pro',
});
