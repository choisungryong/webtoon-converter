import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Note: CORS setup for R2 requires S3 API which is not Edge-compatible.
// Configure CORS directly in Cloudflare Dashboard instead:
// R2 > Your Bucket > Settings > CORS Policy

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'CORS setup requires S3 API access which is not available in Edge runtime.',
        instructions: [
            '1. Go to Cloudflare Dashboard',
            '2. Navigate to R2 > Your Bucket > Settings',
            '3. Add CORS Policy manually:',
            '   - Allowed Origins: * (or your domain)',
            '   - Allowed Methods: GET, PUT, POST, HEAD',
            '   - Allowed Headers: *'
        ]
    });
}
