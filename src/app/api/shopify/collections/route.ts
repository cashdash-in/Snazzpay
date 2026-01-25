import { NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify';

export async function GET() {
  // If the Shopify client failed to initialize, return an empty array.
  if (!shopifyClient) {
    console.error(
      'Shopify client is not initialized in /api/shopify/collections. Check your environment variables.'
    );
    return NextResponse.json([]);
  }

  try {
    const response = await shopifyClient.rest.get({
      path: 'custom_collections',
      query: { limit: '250' },
    });

    const result = (await response.json()) as any;
    return NextResponse.json(result.custom_collections);
  } catch (error) {
    console.error(
      'Error fetching collections from Shopify:', error
    );
    // Return an empty array on error to ensure the frontend does not crash.
    return NextResponse.json([]);
  }
}
