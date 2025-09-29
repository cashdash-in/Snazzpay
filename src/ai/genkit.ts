
import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Define the plugins array.
const plugins: Plugin[] = [];

// Check for the API key and provide a clear error message if it's missing.
if (!process.env.GEMINI_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '******************************************************************************************************************************************************\n' +
        '* The GEMINI_API_KEY environment variable is not set.                                                                                                *\n' +
        '* AI features will be disabled. Please add the key to your hosting provider\'s environment variables to enable them.                                  *\n' +
        '******************************************************************************************************************************************************'
    );
  } else {
    // In development, we can be more descriptive.
    console.warn(
      '******************************************************************************************************************************************************\n' +
        '* The GEMINI_API_KEY environment variable is not set in your .env file.                                                                              *\n' +
        '* AI features will be disabled for this session. To enable them, get a key from Google AI Studio and add it to your .env file.                        *\n' +
        '******************************************************************************************************************************************************'
    );
  }
} else {
    // Only add the Google AI plugin if the key is present.
    plugins.push(googleAI());
}


export const ai = genkit({
  plugins: plugins,
  // The default model for general text generation tasks.
  model: 'googleai/gemini-pro',
});
