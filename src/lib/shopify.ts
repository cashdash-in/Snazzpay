import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY || '',
  scopes: ['read_products', 'read_custom_collections'],
  hostName: process.env.SHOPIFY_STORE_URL || '',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: false,
});

export const shopifyClient = shopify.clients.rest;
