import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Default is 1mb, increase for video uploads if needed
    },
  },
  // Increase the timeout for server actions, as video generation can be slow
  serverActions: {
    bodySizeLimit: '10mb', // Accommodate base64 encoded videos
  },
};

// Vercel specific config to increase function timeout
export const config = {
  maxDuration: 120, // 2 minutes
};


export default nextConfig;
