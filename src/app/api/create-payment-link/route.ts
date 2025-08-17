// This file is deprecated and will be removed in a future update.
// The functionality has been moved to /api/send-auth-link/route.ts
// which uses a more reliable workaround.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
     return new NextResponse(
        JSON.stringify({ error: `This API is deprecated. Please use /api/send-auth-link.` }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
    );
}
