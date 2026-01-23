/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It is the single source of truth for the AI object used throughout the application.
 */
import { genkit, type Plugin } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';

// IMPORTANT: Production Environment Configuration
// For AI features to work in deployed environments (e.g., Vercel, Firebase),
// the `GEMINI_API_KEY` must be set as an environment variable in the hosting
// provider's project settings. The application will fail if this key is not
// found in production.

const plugins: Plugin<any>[] = [
  googleAI({
    apiVersion: 'v1beta',
  }),
];

if (process.env.NODE_ENV === 'production' && !process.env.GCLOUD_PROJECT) {
  // We are in a production-like environment (e.g., Vercel) but not on Google Cloud.
  // We need to disable Firebase plugin to avoid errors about default credentials.
} else {
  // We are in a local or Google Cloud environment, so we can use Firebase.
  plugins.push(firebase());
}

export const ai = genkit({
  plugins,
  // Do not enable flow state in localStorage for server-side code.
  // enableAppFlowState: true,
  // Set a different log level for production builds.
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  // OpenTelemetry is not configured in this environment.
  // openTelemetry: {
  //   instrumentation: {
  //     // ...
  //   },
  // },
});

export { defineDotprompt };
