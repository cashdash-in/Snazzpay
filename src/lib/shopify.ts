import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

const getShopifyConfig = () => ({
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  scopes: (process.env.SHOPIFY_API_SCOPES || '').split(','),
  hostName: (process.env.SHOPIFY_STORE_URL || '').replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

let shopifyClient: any = undefined;

const initializeShopify = () => {
  // Never initialize on client
  if (typeof window !== 'undefined') return;
  
  const config = getShopifyConfig();
  
  // Guard against missing credentials during build/prerender
  if (!config.apiKey || !config.apiSecretKey || !config.hostName) {
    console.warn(
      'Shopify Environment Warning: Missing one or more required Shopify environment variables. Shopify integration will be disabled until variables are set in production settings.'
    );
    return;
  }
  
  try {
    const shopify = shopifyApi(config);
    shopifyClient = new shopify.clients.Rest({
      session: {
        shop: config.hostName,
        accessToken: config.apiKey,
      } as any,
    });
  } catch (error) {
    console.error('Failed to initialize Shopify client:', error);
  }
};

initializeShopify();

export { shopifyClient };
