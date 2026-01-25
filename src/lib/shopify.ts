import { createAdminApiClient, adminApiVersions } from '@shopify/admin-api-client';

// A Shopify client is created for making API requests.
// It is null if the required environment variables are not set.

// Validate that the Shopify environment variables are set.
const isValidShopifyEnv = process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_API_KEY;

if (!isValidShopifyEnv) {
  console.warn(
    'Shopify API credentials are not set. Please set SHOPIFY_STORE_URL and SHOPIFY_API_KEY in your environment variables.'
  );
}

// Create the Shopify client only if the environment variables are valid.
export const shopifyClient = isValidShopifyEnv
  ? createAdminApiClient({
      storeDomain: process.env.SHOPIFY_STORE_URL!,
      apiVersion: '2024-04',
      accessToken: process.env.SHOPIFY_API_KEY!,
    })
  : null;

// This function retrieves all collections from the Shopify store.
// It returns an empty array if the Shopify client is not available.
export async function getCollections() {
  if (!shopifyClient) {
    console.error('Shopify client is not available.');
    return [];
  }

  const response = await shopifyClient.get({
    path: 'custom_collections',
    query: { limit: '250' },
  });

  const result = (await response.json()) as any;
  return result.custom_collections;
}

// This function retrieves all vendors from the Shopify store.
// It returns an empty array if the Shopify client is not available.
export async function getVendors() {
  if (!shopifyClient) {
    console.error('Shopify client is not available.');
    return [];
  }

  const response = await shopifyClient.get({
    path: 'products',
    query: { limit: '250', fields: 'vendor' },
  });

  const result = (await response.json()) as any;
  const vendors = new Set<string>(result.products.map((p: any) => p.vendor));
  return Array.from(vendors);
}

// This function retrieves all tags from the Shopify store.
// It returns an empty array if the Shopify client is not available.
export async function getTags() {
  if (!shopifyClient) {
    console.error('Shopify client is not available.');
    return [];
  }

  const response = await shopifyClient.get({
    path: 'products',
    query: { limit: '250', fields: 'tags' },
  });

  const result = (await response.json()) as any;
  const tags = new Set<string>(result.products.flatMap((p: any) => p.tags.split(', ')));
  return Array.from(tags);
}
