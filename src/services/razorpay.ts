
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

const PaymentLinkSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

export type Mandate = z.infer<typeof MandateSchema>;
export type Customer = z.infer<typeof CustomerSchema>;

async function razorpayFetch(endpoint: string, options: RequestInit = {}) {
    const url = `https://api.razorpay.com/v1/${endpoint}`;
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || RAZORPAY_KEY_ID === 'rzp_test_xxxxxxxxxxxxxx') {
        console.error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables in .env file.');
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
        const customer = await razorpayFetch('customers', {
            method: 'POST',
            body: JSON.stringify({
                name: "Secure COD Customer",
                email: "secure.cod@example.com", // Generic email
            })
        });

        const orderPayload = {
            amount: maxAmount,
            currency: 'INR',
            payment_capture: 1,
            notes: {
                description: `Secure COD Authorization for: ${description}`
            }
        };

        const order = await razorpayFetch('orders', {
            method: 'POST',
            body: JSON.stringify(orderPayload)
        });

        const paymentLinkPayload = {
            amount: maxAmount,
            currency: "INR",
            description: `eMandate for ${description}`,
            customer: {
                name: customer.name,
                email: customer.email,
            },
            upi_qr: false,
            first_payment_min_amount: 100, // Rs 1 verification charge
            subscription_registration: {
                method: "emandate",
                max_amount: maxAmount,
                frequency: "as_presented",
            },
            notes: {
                orderId: order.id,
            },
            callback_url: "https://snazzify.co.in/thank-you",
            callback_method: "get"
        };
        
        const jsonResponse = await razorpayFetch('payment_links', {
            method: 'POST',
            body: JSON.stringify(paymentLinkPayload),
        });

        const parsed = PaymentLinkSchema.safeParse(jsonResponse);
        if (!parsed.success) {
            console.error("Failed to parse Razorpay payment link response:", parsed.error);
            return { success: false, error: "Could not create mandate link." };
        }

        return { success: true, url: parsed.data.short_url };
    } catch (error: any) {
        console.error("Error creating Razorpay payment link:", error);
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

        // This is a workaround as subscriptions don't map perfectly to on-demand mandates
        // We will need to find the actual mandates via a different endpoint in a real scenario
        return []; 
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
