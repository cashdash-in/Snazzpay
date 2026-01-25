import { initializeGenkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';

initializeGenkit({
  plugins: [firebase()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
