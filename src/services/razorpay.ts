
'use server';

// This file is intentionally left with a deprecated function.
// The entire mandate creation logic has been moved to the client-side
// in /src/app/secure-cod/page.tsx to use the official Razorpay Checkout SDK.
// This is a more robust and reliable approach that avoids the server-to-server
// networking issues that were causing errors.

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    console.error("createSubscriptionLink is deprecated and should not be called. The Razorpay integration is now handled entirely on the client-side.");
    return {
        success: false,
        error: "This server-side function is deprecated. Please use the client-side Razorpay Checkout SDK implemented on the /secure-cod page."
    };
}
