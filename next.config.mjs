import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Setup Cloudflare bindings for local development
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'banatoon.app',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
