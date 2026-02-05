export async function register() {
  // We only want to run this code on the server.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeGenkit } = await import('@genkit-ai/core');
    // Use dynamic import to get the named export from the firebase plugin.
    const { firebase } = await import('@genkit-ai/firebase');

    initializeGenkit({
      plugins: [firebase()],
      logLevel: 'debug',
      enableTracingAndMetrics: true,
    });
  }
}
