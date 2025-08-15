
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const PaymentLinkResponseSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

async function razorpayFetch(endpoint: string, options: RequestInit) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const url = `https://api.razorpay.com/v1/${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store',
    });

    const jsonResponse = await response.json();

    if (!response.ok) {
        console.error(`Razorpay API Error (${url}):`, jsonResponse);
        throw new Error(jsonResponse?.error?.description || `Failed API call to ${endpoint}`);
    }
    return jsonResponse;
}


export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
       // This is the corrected payload, containing only the fields required for creating
       // a payment link with a subscription registration.
       const payload = {
            amount: 100, // Mandate verification charge (e.g., Re. 1)
            currency: "INR",
            description: `Mandate for ${description}`,
            subscription_registration: {
                "first_payment_amount": 100, // Must match the 'amount' field
                "max_amount": maxAmount * 100, // The actual maximum chargeable amount
                "total_count": 100, // A large number for on-demand charges
                "period": "yearly",
                "interval": 10, // A long-running mandate (10 years)
            },
            customer: {
                // You can prefill customer details here if available
            },
            notify: {
                sms: true,
                email: true
            },
            notes: {
                policy_name: "SnazzPay SecureCOD"
            },
            callback_url: "https://snazzify.co.in/", // Your post-payment redirect URL
            callback_method: "get"
        };

        const response = await razorpayFetch('payment_links', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const parsedResponse = PaymentLinkResponseSchema.safeParse(response);
         if (!parsedResponse.success) {
            console.error("Failed to parse Razorpay Payment Link response:", parsedResponse.error.flatten());
            return { success: false, error: "Could not create mandate link due to unexpected response from Razorpay." };
        }

        return { success: true, url: parsedResponse.data.short_url };

    } catch (error: any) {
        console.error("Error creating Razorpay payment link:", error);
        return { success: false, error: error.message || "An unexpected error occurred while creating the mandate link." };
    }
}
