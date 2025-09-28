
import { NextResponse } from 'next/server';
import { createProduct, type ShopifyProductInput } from '@/services/shopify';

export async function POST(request: Request) {
    try {
        const payload: ShopifyProductInput = await request.json();

        if (!payload.title || !payload.body_html || !payload.variants) {
             return NextResponse.json({ error: "Invalid product data provided. Missing title, description, or variants." }, { status: 400 });
        }
        
        const shopifyResponse = await createProduct(payload);

        return NextResponse.json({ success: true, product: shopifyResponse });

    } catch (error: any) {
        console.error("--- Shopify Product Creation Error ---");
        console.error(error);
        const errorMessage = error.message || 'An unknown error occurred while creating the product in Shopify.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
