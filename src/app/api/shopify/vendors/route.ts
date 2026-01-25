import { NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify';

export async function GET() {
  // If the Shopify client failed to initialize, return an empty array.
  if (!shopifyClient) {
    console.error(
      'Shopify client is not initialized in /api/shopify/vendors. Check your environment variables.'
    );
    return NextResponse.json([]);
  }

  try {
    const response = await shopifyClient.rest.get({
      path: 'products',
      query: { limit: '250', fields: 'vendor' },
    });

    const result = (await response.json()) as any;
    const vendors = new Set<string>(result.products.map((p: any) => p.vendor));
    return NextResponse.json(Array.from(vendors));
  } catch (error) {
    console.error(
      'Error fetching vendors from Shopify:', error
    );
    // Return an empty array on error to ensure the frontend does not crash.
    return NextResponse.json([]);
  }
}
