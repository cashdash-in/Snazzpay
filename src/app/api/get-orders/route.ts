
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

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
    line_items: z.array(z.object({
        id: z.number(),
        title: z.string(),
        quantity: z.number(),
        price: z.string(),
    })),
});

const OrdersResponseSchema = z.object({
    orders: z.array(OrderSchema),
});


async function shopifyFetch(endpoint: string, options: RequestInit = {}) {
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'X-Shopify-Access-Token': SHOPIFY_API_KEY!,
            'Content-Type': 'application/json',
            ...options.headers,
        },
        cache: 'no-store', 
    });
    
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Shopify API error: ${response.status} ${response.statusText} - ${errorBody}`);
        throw new Error(`Shopify API Error: ${response.statusText}.`);
    }

    return response.json();
}

export async function GET() {
    if (!SHOPIFY_STORE_URL || !SHOPIFY_API_KEY || !SHOPIFY_API_KEY.startsWith('shpat_')) {
        console.warn('Shopify API keys are not configured correctly on the server.');
        return new NextResponse(
            JSON.stringify({ error: "Shopify API keys are not configured on the server. Please check your hosting environment variables." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const jsonResponse = await shopifyFetch('orders.json?status=any');
        const parsed = OrdersResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Shopify orders response:", parsed.error.toString());
            return new NextResponse(
                JSON.stringify({ error: "Failed to parse data from Shopify." }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return NextResponse.json({ orders: parsed.data.orders });
        
    } catch (error: any) {
        console.error("Error in get-orders API route:", error);
        return new NextResponse(
            JSON.stringify({ error: error.message || 'An unknown error occurred while fetching from Shopify.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
