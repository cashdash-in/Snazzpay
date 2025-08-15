
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

export async function getMandates(): Promise<any[]> {
    // In a real app, you'd fetch from Razorpay API.
    // This is placeholder data.
    console.log("Fetching mandates (mock)...");
    return [];
}

export async function getCustomer(id: string): Promise<any> {
    console.log(`Fetching customer ${id} (mock)...`);
    return { name: 'Placeholder Customer' };
}

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        }

        const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const planPayload = {
            period: "yearly",
            interval: 1,
            item: {
                name: `Annual Mandate for ${description}`,
                amount: 100, // Nominal amount, actual charge is up to maxAmount
                currency: "INR",
                description: "Authorization for variable charges"
            }
        };

        const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(planPayload),
            cache: 'no-store',
        });
        
        const planData = await planResponse.json();

        if (!planResponse.ok) {
            throw new Error(planData?.error?.description || 'Failed to create Razorpay plan');
        }

        const subscriptionPayload = {
            plan_id: planData.id,
            total_count: 120, // 10 years
            quantity: 1,
            customer_notify: 1,
            notes: {
                purpose: "Secure COD Mandate",
                description: description
            },
            authorization_amount: maxAmount, // THIS IS THE KEY PART
            payment_capture: 0, // We capture manually later, not on authorization
        };

        const subResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscriptionPayload),
            cache: 'no-store',
        });
        
        const jsonResponse = await subResponse.json();

        if (!subResponse.ok) {
            throw new Error(jsonResponse?.error?.description || 'Failed to create Razorpay subscription');
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
