
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

// Step 1: Create a long-term, nominal plan to act as a template for the mandate.
async function createPlan(): Promise<string> {
    const planPayload = {
        period: "yearly",
        interval: 10, // A long-running mandate (10 years)
        item: {
            name: "SnazzPay SecureCOD Mandate Plan",
            amount: 100, // Mandate verification charge (Re. 1)
            currency: "INR",
            description: "Plan for authorizing future COD payments."
        }
    };

    const response = await razorpayFetch('plans', {
        method: 'POST',
        body: JSON.stringify(planPayload),
    });

    const parsed = PlanResponseSchema.safeParse(response);
    if (!parsed.success) {
        console.error("Failed to parse Razorpay Plan response:", parsed.error.flatten());
        throw new Error("Could not create mandate plan due to unexpected response.");
    }
    return parsed.data.id;
}


// Step 2: Create a subscription using the plan and set the authorization amount.
export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        const planId = await createPlan();

        const subscriptionPayload = {
            plan_id: planId,
            total_count: 1, // This subscription is for a single authorization cycle.
            quantity: 1,
            customer_notify: 1,
             notes: {
                description: `Mandate for ${description}`,
                amount: `Up to ₹${maxAmount.toFixed(2)}`
            },
            // The auth amount is part of the subscription, not the plan
            authorization_amount: maxAmount * 100, 
        };

        const response = await razorpayFetch('subscriptions', {
            method: 'POST',
            body: JSON.stringify(subscriptionPayload),
        });

        const parsedResponse = SubscriptionResponseSchema.safeParse(response);
         if (!parsedResponse.success) {
            console.error("Failed to parse Razorpay Subscription response:", parsedResponse.error.flatten());
            return { success: false, error: "Could not create mandate link due to unexpected response from Razorpay." };
        }

        return { success: true, url: parsedResponse.data.short_url };

    } catch (error: any) {
        console.error("Error creating Razorpay subscription link:", error);
        return { success: false, error: error.message || "An unexpected error occurred while creating the mandate link." };
    }
}
