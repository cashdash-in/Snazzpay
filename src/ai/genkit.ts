
/**
 * @fileoverview This file initializes and a new Genkit AI instance.
 * It is the single source of truth for the AI object used throughout the application.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
// import firebase from '@genkit-ai/firebase'; // REMOVED to fix build errors

// IMPORTANT: Production Environment Configuration
// For AI features to work in deployed environments (e.g., Vercel, Firebase),
// the `GEMINI_API_KEY` must be set as an environment variable in the hosting
// provider's project settings. The application will fail if this key is not
// found in production.

export const ai = genkit({
  plugins: [
    googleAI({ apiVersion: 'v1' }),
    // firebase, // REMOVED to fix build errors
  ],
  // Do not enable flow state in localStorage for server-side code.
  // enableAppFlowState: true,
  // OpenTelemetry is not configured in this environment.
  // openTelemetry: {
  //   instrumentation: {
  //     // ...
  //   },
  // },
});
