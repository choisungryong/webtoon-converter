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

    // Auth
    KAKAO_CLIENT_ID: string;
    KAKAO_CLIENT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    APP_URL: string;

    // Payments
    TOSS_CLIENT_KEY: string;
    TOSS_SECRET_KEY: string;
    TOSS_WEBHOOK_SECRET: string;
  }
}
