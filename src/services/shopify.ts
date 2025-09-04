
'use server';

import { z } from 'zod';
import { toast } from '@/hooks/use-toast';

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
    if (!SHOPIFY_STORE_URL || !SHOPIFY_API_KEY || !SHOPIFY_API_KEY.startsWith('shpat_')) {
        console.warn('Shopify API keys are not configured correctly on the server. Skipping Shopify API call.');
        // This is a special string to indicate to the caller that the request was skipped.
        return 'SKIPPED_CONFIGURATION';
    }
    
    // Add a cache-busting timestamp to every request to ensure freshness.
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/${endpoint}${endpoint.includes('?') ? '&' : '?'}t=${new Date().getTime()}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_API_KEY,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store', 
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Shopify API error: ${response.status} ${response.statusText} - ${errorBody}`);
        throw new Error(`Shopify API Error: ${response.statusText}. Check server logs for details.`);
    }

    return response.json();
}

export async function getOrders(): Promise<Order[]> {
    try {
        const jsonResponse = await shopifyFetch('orders.json?status=any');
        
        if (jsonResponse === 'SKIPPED_CONFIGURATION') {
            throw new Error("Failed to load Shopify Orders. Please ensure SHOPIFY_STORE_URL and SHOPIFY_API_KEY (Admin API access token) are set correctly in your hosting environment's settings.");
        }

        if (!jsonResponse) {
            throw new Error("Received an empty response from Shopify fetch.");
        }

        const parsed = OrdersResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Shopify orders response:", parsed.error);
            // This toast is not possible in a server component. We rely on the catch block.
            return [];
        }

        return parsed.data.orders;
    } catch (error) {
        console.error("Error fetching Shopify orders:", error);
        // We cannot call useToast here as this is a server-side function.
        // The error will be caught on the client-side where this function is called.
        // We re-throw the error so the client knows something went wrong.
        throw error;
    }
}

    