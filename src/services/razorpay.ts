
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxxxxxx';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'testsecret';

const MandateSchema = z.object({
    id: z.string(),
    entity: z.string(),
    customer_id: z.string(),
    method: z.string(),
    status: z.enum(['created', 'active', 'pending', 'halted', 'completed', 'cancelled', 'failed']),
    amount: z.number().nullable(),
    amount_rule: z.string(),
    max_amount: z.number(),
    start_date: z.number().optional(),
    end_date: z.number().optional(),
    total_cycles: z.number().optional(),
    paid_cycles: z.number().optional(),
    created_at: z.number(),
    next_debit_date: z.number().optional(),
});

const MandatesResponseSchema = z.object({
    entity: z.string(),
    count: z.number(),
    items: z.array(MandateSchema),
});

const CustomerSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    contact: z.string().nullable(),
});

const SubscriptionSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

export type Mandate = z.infer<typeof MandateSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

async function razorpayFetch(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.razorpay.com/v1/${endpoint}`;
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error(`Razorpay API error for ${endpoint}:`, errorBody);
        throw new Error(errorBody?.error?.description || 'An unknown Razorpay API error occurred');
    }
    return response.json();
}

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        const subscriptionPayload = {
            plan: {
                period: "yearly",
                interval: 1,
                item: {
                    name: "Secure COD Mandate",
                    amount: 100, // Nominal amount for the plan, 1 Rupee.
                    currency: "INR",
                    description: "Authorization for Secure COD"
                }
            },
            total_count: 1,
            quantity: 1,
            customer_notify: 0,
            notes: {
                description: `Secure COD for: ${description}`
            },
            subscription_items: [
                {
                    item: {
                        name: "eMandate for COD",
                        amount: maxAmount, // This sets the max_amount on the mandate
                        currency: "INR",
                        description: `Authorization for ${description}`
                    }
                }
            ]
        };

        const jsonResponse = await razorpayFetch('subscriptions', {
            method: 'POST',
            body: JSON.stringify(subscriptionPayload),
        });

        const parsed = SubscriptionSchema.safeParse(jsonResponse);
        if (!parsed.success) {
            console.error("Failed to parse Razorpay subscription response:", parsed.error);
            return { success: false, error: "Could not create mandate link." };
        }

        return { success: true, url: parsed.data.short_url };
    } catch (error: any) {
        console.error("Error creating Razorpay subscription:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}


export async function getMandates(): Promise<Mandate[]> {
    try {
        // This will fetch all mandates since we don't have a plan_id to filter by
        const jsonResponse = await razorpayFetch(`subscriptions`);
        const parsed = MandatesResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Razorpay mandates response:", parsed.error);
            return [];
        }

        return parsed.data.items;
    } catch (error) {
        console.error("Error fetching Razorpay mandates:", error);
        return [];
    }
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
    try {
        const jsonResponse = await razorpayFetch(`customers/${customerId}`);
        const parsed = CustomerSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error(`Failed to parse Razorpay customer response for ${customerId}:`, parsed.error);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error(`Error fetching Razorpay customer ${customerId}:`, error);
        return null;
    }
}
