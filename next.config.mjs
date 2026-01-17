import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Setup Cloudflare bindings for local development
if (process.env.NODE_ENV === 'development') {
    setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
};

export default nextConfig;
