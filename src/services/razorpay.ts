
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const PlanResponseSchema = z.object({
    id: z.string(),
});

const SubscriptionResponseSchema = z.object({
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
        // Step 1: Create a Plan. This is a long-term, nominal-value plan to establish the mandate.
        const planPayload = {
            period: "yearly",
            interval: 10, // A long period like 10 years
            item: {
                name: "SnazzPay SecureCOD Mandate",
                amount: 100, // Mandate verification charge (Re. 1)
                currency: "INR",
                description: "One-time charge for setting up Secure COD mandate."
            }
        };

        const planResponse = await razorpayFetch('plans', {
            method: 'POST',
            body: JSON.stringify(planPayload),
        });

        const parsedPlan = PlanResponseSchema.safeParse(planResponse);
        if (!parsedPlan.success) {
            console.error("Failed to parse Razorpay Plan response:", parsedPlan.error.flatten());
            return { success: false, error: "Could not create mandate due to unexpected response from Razorpay (Plan)." };
        }
        const plan_id = parsedPlan.data.id;


        // Step 2: Create a Subscription using the Plan ID and set the authorization amount.
        const subscriptionPayload = {
            plan_id: plan_id,
            total_count: 1, // This is a one-time mandate setup
            quantity: 1,
            customer_notify: 1,
            authorization_amount: maxAmount * 100, // The actual order amount in paise
            notes: {
                description: `Mandate for: ${description}`
            }
        };
        
        const subscriptionResponse = await razorpayFetch('subscriptions', {
            method: 'POST',
            body: JSON.stringify(subscriptionPayload),
        });

        const parsedSubscription = SubscriptionResponseSchema.safeParse(subscriptionResponse);
        if (!parsedSubscription.success) {
            console.error("Failed to parse Razorpay Subscription response:", parsedSubscription.error.flatten());
            return { success: false, error: "Could not create mandate link due to unexpected response from Razorpay (Subscription)." };
        }

        return { success: true, url: parsedSubscription.data.short_url };

    } catch (error: any) {
        console.error("Error creating Razorpay subscription link:", error);
        return { success: false, error: error.message || "An unexpected error occurred while creating the mandate link." };
    }
}
