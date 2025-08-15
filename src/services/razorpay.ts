
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const SubscriptionResponseSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        }

        const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const subscriptionPayload = {
            plan: {
                period: "yearly",
                interval: 1,
                item: {
                    name: "Secure COD Mandate Plan",
                    amount: 100, // Nominal amount (Re. 1) for mandate verification
                    currency: "INR",
                    description: `Annual mandate for ${description}`
                }
            },
            total_count: 120, // Mandate valid for 10 years (120 months)
            quantity: 1,
            customer_notify: 1,
            authorization_amount: maxAmount, // The actual maximum amount for future charges
            notes: {
                description: `Mandate for: ${description}`
            }
        };

        const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionPayload),
            cache: 'no-store',
        });
        
        const jsonResponse = await response.json();

        if (!response.ok) {
            console.error("Razorpay Subscription API Error:", jsonResponse);
            throw new Error(jsonResponse?.error?.description || 'Failed to create Razorpay subscription link');
        }

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
