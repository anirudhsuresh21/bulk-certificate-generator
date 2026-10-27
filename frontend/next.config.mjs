import nextEnv from '@next/env';
import path from 'path';
import { fileURLToPath } from 'url';

const { loadEnvConfig } = nextEnv;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load common root .env for monorepo configuration
loadEnvConfig(path.resolve(__dirname, '..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // For pdfjs-dist worker canvas compatibility
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
