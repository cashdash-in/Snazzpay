
'use server';

import { z } from 'zod';

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

const SubscriptionLinkSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

export type Mandate = z.infer<typeof MandateSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

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
        cache: 'no-store',
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
        const subscriptionPayload = {
            plan: {
                period: "yearly",
                interval: 1,
                item: {
                    name: `Mandate for ${description}`,
                    amount: 100, // Verification amount of Re. 1. This will be the first charge.
                    currency: "INR",
                    description: "Authorization for future charges"
                },
            },
            total_count: 100, // A large number for a long-running mandate
            quantity: 1,
            customer_notify: 1,
            notes: {
                description: `Secure COD Authorization for: ${description}`
            },
            // The max_amount for the mandate is set in the subscription itself
            authorization_amount: maxAmount // Set the max amount for the mandate
        };
        
        const jsonResponse = await razorpayFetch('subscriptions', {
            method: 'POST',
            body: JSON.stringify(subscriptionPayload),
        });

        const parsed = SubscriptionLinkSchema.safeParse(jsonResponse);
        if (!parsed.success) {
            console.error("Failed to parse Razorpay subscription response:", parsed.error);
            return { success: false, error: "Could not create mandate link." };
        }

        return { success: true, url: parsed.data.short_url };
    } catch (error: any) {
        console.error("Error creating Razorpay subscription link:", error);
        return { success: false, error: error.message || "An unexpected error occurred." };
    }
}


export async function getMandates(): Promise<Mandate[]> {
    try {
        // This endpoint should be /mandates, not /subscriptions to fetch mandates.
        const jsonResponse = await razorpayFetch(`mandates`);
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
