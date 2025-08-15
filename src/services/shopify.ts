
'use server';

import { z } from 'zod';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || "www.snazzify.co.in";
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "shpat_xxxxxxxxxxxxxxxx";

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
});

const OrdersResponseSchema = z.object({
    orders: z.array(OrderSchema),
});

export type Order = z.infer<typeof OrderSchema>;

export async function getOrders(): Promise<Order[]> {
    try {
        const response = await fetch(`https://${SHOPIFY_STORE_URL}/admin/api/2023-10/orders.json?status=any`, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_API_KEY,
            },
            cache: 'no-store', // Ensure fresh data
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const jsonResponse = await response.json();
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
