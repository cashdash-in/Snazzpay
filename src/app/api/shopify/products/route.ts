
import { NextResponse } from 'next/server';
import { getProducts } from '@/services/shopify';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const products = await getProducts();
        return NextResponse.json(products);
    } catch (error: any) {
        return new NextResponse(
            JSON.stringify({ error: `Failed to fetch Shopify products: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
