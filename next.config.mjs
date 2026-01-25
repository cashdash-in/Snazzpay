/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is required for Genkit to work.
    instrumentationHook: true,
  },
};

export default nextCode;
