import { shopifyApi, ApiVersion, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL || '';
const SHOPIFY_API_SCOPES = process.env.SHOPIFY_API_SCOPES || '';

let shopifyClient: any = undefined;

try {
  if (
    !SHOPIFY_API_KEY ||
    !SHOPIFY_API_SECRET ||
    !SHOPIFY_STORE_URL ||
    !SHOPIFY_API_SCOPES
  ) {
    throw new Error(
      'Missing one or more required Shopify environment variables.'
    );
  }

  const shopify = shopifyApi({
    apiKey: SHOPIFY_API_KEY,
    apiSecretKey: SHOPIFY_API_SECRET,
    scopes: SHOPIFY_API_SCOPES.split(','),
    hostName: SHOPIFY_STORE_URL.replace(/^https?_\/\//, ''),
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: false,
  });

  shopifyClient = new shopify.clients.Rest({
    session: {
      shop: SHOPIFY_STORE_URL,
      accessToken: SHOPIFY_API_KEY, // Use the admin access token
    } as any,
  });
} catch (error) {
  console.error('Failed to initialize Shopify client:', error);
  // In case of error, shopifyClient will remain undefined
}

export { shopifyClient };
