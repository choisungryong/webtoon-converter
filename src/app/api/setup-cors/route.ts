import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        message: 'CORS setup requires manual configuration in Cloudflare Dashboard.',
        instructions: [
            '1. Go to Cloudflare Dashboard',
            '2. Navigate to R2 > Your Bucket > Settings',
            '3. Add CORS Policy manually'
        ]
    });
}
