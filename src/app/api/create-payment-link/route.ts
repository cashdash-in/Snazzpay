
import { NextResponse } from 'next/server';
// This API route is deprecated and no longer used.
// The new authorization flow is handled client-side in /delivery-tracking/page.tsx
// by calling the /api/create-mandate-order route.
// This file is left to prevent breaking any old references but should be considered obsolete.

export async function POST(request: Request) {
    console.warn("DEPRECATED: /api/create-payment-link is no longer in use.");
    return new NextResponse(
        JSON.stringify({ 
            error: "This API route is deprecated. Please use the new authorization flow from the delivery tracking page." 
        }),
        { status: 410, headers: { 'Content-Type': 'application/json' } } // 410 Gone
    );
}
