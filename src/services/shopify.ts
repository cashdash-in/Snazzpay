
'use server';

import { z } from 'zod';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "www.snazzify.co.in";

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
    const storeUrl = typeof window !== 'undefined'
        ? localStorage.getItem('shopify_store_url')
        : process.env.SHOPIFY_STORE_URL;
    
    const apiKey = typeof window !== 'undefined'
        ? localStorage.getItem('shopify_api_key')
        : process.env.SHOPIFY_API_KEY;

    if (!storeUrl || !apiKey || apiKey === 'shpat_xxxxxxxxxxxxxxxx') {
        throw new Error('Shopify API keys are not configured.');
    }
    
    const url = `https://${storeUrl}/admin/api/2023-10/${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'X-Shopify-Access-Token': apiKey,
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
