# Genkit AI Flows

This directory contains all the server-side AI functionality for the application, powered by Genkit.

## IMPORTANT: Production Configuration

For the AI features to work in your deployed production environment (e.g., on Netlify, Vercel), you **MUST** set the `GEMINI_API_KEY` as an environment variable in your hosting provider's project settings.

The application will fail with an error if this key is not found in the production environment. This is a security measure to ensure your API key is not exposed in the client-side code.

### How to set it up:

1.  Go to your hosting provider's dashboard (Netlify, Vercel, etc.).
2.  Find the settings for your project.
3.  Locate the "Environment Variables" section.
4.  Add a new variable with the key `GEMINI_API_KEY` and paste your actual Google AI API key as the value.
5.  Redeploy your application for the new variable to take effect.
