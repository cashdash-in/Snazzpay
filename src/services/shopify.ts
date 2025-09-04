
'use server';

import { z } from 'zod';

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

export type Order = z.infer<typeof OrderSchema>;

export async function getOrders(): Promise<Order[]> {
    try {
        // This function now fetches from the internal API route handler.
        // This is a more robust pattern for Next.js applications.
        const response = await fetch('/api/get-orders', { cache: 'no-store' });

        if (!response.ok) {
            const errorResult = await response.json();
            // Re-throw the error message from the API route to be caught by the client.
            throw new Error(errorResult.error || 'Failed to fetch orders from the server.');
        }

        const result = await response.json();
        return result.orders;

    } catch (error: any) {
        console.error("Error fetching Shopify orders from internal API:", error);
        // Re-throw the error so the client-side useToast can display it.
        throw error;
    }
}
