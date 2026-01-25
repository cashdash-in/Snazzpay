
import { NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify';

export async function GET() {
  // If the Shopify client failed to initialize (e.g., due to missing or invalid credentials),
  // return an empty array to prevent the application from crashing.
  if (!shopifyClient) {
    console.error(
      'Shopify client is not initialized in /api/shopify/products. Check your environment variables.'
    );
    return NextResponse.json([]);
  }

  try {
    const response = await shopifyClient.get({
      path: 'products',
      query: { limit: '250', fields: 'id,title,vendor,product_type' },
    });

    const result = (await response.json()) as any;
    return NextResponse.json(result.products);
  } catch (error) {
    console.error(
      'Error fetching products from Shopify:', error
    );
    // Return an empty array on error to ensure the frontend does not crash.
    return NextResponse.json([]);
  }
}
