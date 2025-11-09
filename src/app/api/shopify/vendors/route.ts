
import { NextResponse } from 'next/server';
import { getVendors } from '@/services/shopify';

export async function GET(request: Request) {
    try {
        const vendors = await getVendors();
        return NextResponse.json(vendors);
    } catch (error: any) {
        return new NextResponse(
            JSON.stringify({ error: `Failed to fetch Shopify vendors: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
