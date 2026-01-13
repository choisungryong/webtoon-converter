interface CloudflareEnv {
    R2: R2Bucket;
    DB: D1Database;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;
    AI: any; // Cloudflare Workers AI Binding
    REPLICATE_API_TOKEN: string; // Replicate API Token
    GEMINI_API_KEY: string; // Gemini API Key
    [key: string]: any;
}
