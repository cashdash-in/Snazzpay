
'use server';

import { z } from 'zod';

// These keys MUST be set as environment variables on the server.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_ID === 'rzp_test_xxxxxxxxxxxxxx') {
        throw new Error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

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
        const planPayload = {
             period: "yearly",
             interval: 1,
             item: {
                 name: "Authorization for Secure COD",
                 amount: 100, // 1 Rupee. This is a nominal amount for plan creation.
                 currency: "INR",
                 description: "eMandate for future charges."
             }
        };

        const plan = await razorpayFetch('plans', {
            method: 'POST',
            body: JSON.stringify(planPayload),
        });

        const subscriptionPayload = {
            plan_id: plan.id,
            total_count: 36, // Number of debits
            quantity: 1,
            customer_notify: 0,
            notes: {
                description: `Secure COD for: ${description}`
            },
            auth_type: 'debit',
            mandate: {
                amount: maxAmount,
                amount_rule: 'max',
                frequency: 'as_presented',
                debit_type: 'on_demand',
            },
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
