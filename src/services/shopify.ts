
'use server';

import { z } from 'zod';

// These keys MUST be set as environment variables on the server.
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;


const LineItemSchema = z.object({
    id: z.number(),
    title: z.string(),
    quantity: z.number(),
    price: z.string(),
});

const OrderSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string(),
    total_price: z.string(),
    financial_status: z.string().nullable(),
    customer: z.object({
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
    }).nullable(),
    shipping_address: z.object({
        address1: z.string().nullable(),
        city: z.string().nullable(),
        zip: z.string().nullable(),
        province: z.string().nullable(),
        country: z.string().nullable(),
    }).nullable(),
    line_items: z.array(LineItemSchema),
});

const OrdersResponseSchema = z.object({
    orders: z.array(OrderSchema),
});

export type Order = z.infer<typeof OrderSchema>;

async function shopifyFetch(endpoint: string, options: RequestInit = {}) {
    if (!SHOPIFY_STORE_URL || !SHOPIFY_API_KEY || SHOPIFY_API_KEY === 'shpat_xxxxxxxxxxxxxxxx') {
        throw new Error('Shopify API keys are not configured on the server. Please set SHOPIFY_STORE_URL and SHOPIFY_API_KEY environment variables.');
    }
    
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_API_KEY,
            ...options.headers,
        },
        cache: 'no-store', // Ensure fresh data
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json();
}

export async function getOrders(): Promise<Order[]> {
    try {
        const jsonResponse = await shopifyFetch('orders.json?status=any');
        const parsed = OrdersResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Shopify orders response:", parsed.error);
            return [];
        }

        return parsed.data.orders;
    } catch (error) {
        console.error("Error fetching Shopify orders:", error);
        return [];
    }
}
