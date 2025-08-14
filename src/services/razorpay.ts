
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_xxxxxxxxxxxxxx';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'supersecretpassword';

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

export type Mandate = z.infer<typeof MandateSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

async function razorpayFetch(endpoint: string) {
    const url = `https://api.razorpay.com/v1/${endpoint}`;
    const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Basic ${credentials}`,
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Razorpay API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    return response.json();
}

export async function getMandates(): Promise<Mandate[]> {
    try {
        const jsonResponse = await razorpayFetch('subscriptions?plan_id=plan_XXXXXXXXXXXXXX'); // This plan ID needs to be configured
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
