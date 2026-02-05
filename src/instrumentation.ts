
export async function register() {
  // We only want to run this code on the server.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { genkit } = await import('genkit');
    const { firebase } = await import('@genkit-ai/firebase');

    genkit({
      plugins: [firebase()],
      enableTracingAndMetrics: true,
    });
  }
}
