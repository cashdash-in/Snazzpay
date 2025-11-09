
import { NextResponse } from 'next/server';
import { getCollections } from '@/services/shopify';

export async function GET(request: Request) {
    try {
        const collections = await getCollections();
        return NextResponse.json(collections);
    } catch (error: any) {
        return new NextResponse(
            JSON.stringify({ error: `Failed to fetch Shopify collections: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
