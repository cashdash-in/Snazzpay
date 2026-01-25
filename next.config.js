/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        os: false,
        path: false,
        child_process: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
