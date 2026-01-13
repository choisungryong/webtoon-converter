import { NextResponse } from 'next/server';

// Testing without explicit edge runtime

export async function GET() {
    return NextResponse.json({
        message: "API is working!",
        timestamp: new Date().toISOString()
    });
}
