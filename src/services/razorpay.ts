
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// This schema is for the response when creating a subscription
const SubscriptionResponseSchema = z.object({
    id: z.string(),
    entity: z.string(),
    short_url: z.string(),
});

async function razorpayFetch(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.razorpay.com/v1/${endpoint}`;
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        console.error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        throw new Error('Razorpay API keys are not configured on the server.');
    }

    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store', // Ensure we always get fresh data
    });

    const responseData = await response.json();
    
    if (!response.ok) {
        console.error(`Razorpay API error for ${endpoint}:`, responseData);
        throw new Error(responseData?.error?.description || 'An unknown Razorpay API error occurred');
    }
    return responseData;
}

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        const payload = {
            plan: {
                period: "yearly",
                interval: 1,
                item: {
                    name: `Mandate for: ${description}`,
                    amount: 100, // This is a nominal amount for the plan, Re. 1.
                    currency: "INR",
                    description: "Authorization for future variable charges for your orders."
                }
            },
            // This is the key field for the mandate. It sets the max amount that can be charged.
            authorization_amount: maxAmount,
            total_count: 120, // A high number for a long-lived mandate (e.g., 10 years)
            quantity: 1,
            customer_notify: 1, // Let Razorpay handle notifying the customer
            notes: {
                purpose: "Secure COD Mandate",
                description: description
            }
        };

        const jsonResponse = await razorpayFetch('subscriptions', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const parsed = SubscriptionResponseSchema.safeParse(jsonResponse);
        if (!parsed.success) {
            console.error("Failed to parse Razorpay subscription response:", parsed.error.flatten());
            return { success: false, error: "Could not create mandate link due to unexpected response from Razorpay." };
        }

        return { success: true, url: parsed.data.short_url };
    } catch (error: any) {
        console.error("Error creating Razorpay subscription link:", error);
        return { success: false, error: error.message || "An unexpected error occurred while creating the mandate link." };
    }
}
