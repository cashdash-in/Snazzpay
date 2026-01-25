
const { hostname } = new URL(process.env.SHOPIFY_STORE_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname,
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
