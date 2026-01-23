import type { WorkersAI } from './src/types';

declare global {
  interface CloudflareEnv {
    // Cloudflare Bindings
    R2: R2Bucket;
    DB: D1Database;
    AI: WorkersAI;

    // R2 Configuration
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;

    // API Keys
    REPLICATE_API_TOKEN: string;
    GEMINI_API_KEY: string;

    // App Configuration
    QNA_ADMIN_PASSWORD: string;
  }
}
