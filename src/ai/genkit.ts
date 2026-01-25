
/**
 * @fileoverview This file initializes and configures the Genkit AI instance.
 * It is the single source of truth for the AI object used throughout the application.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
// We are removing firebase telemetry as it can cause issues in some environments.
// import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// IMPORTANT: Production Environment Configuration
// For AI features to work in deployed environments (e.g., Vercel, Firebase),
// the `GEMINI_API_KEY` must be set as an environment variable in the hosting
// provider's project settings. The application will fail if this key is not
// found in production.

// if (process.env.NODE_ENV === 'production' && !process.env.GCLOUD_PROJECT) {
//   // We are in a production-like environment (e.g., Vercel) but not on Google Cloud.
//   // We need to disable Firebase plugin to avoid errors about default credentials.
// } else {
//   // We are in a local or Google Cloud environment, so we can use Firebase.
//   enableFirebaseTelemetry();
// }

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
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
