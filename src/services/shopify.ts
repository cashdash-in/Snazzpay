
'use server';

import { z } from 'zod';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;

const LineItemSchema = z.object({
    id: z.number(),
    title: z.string(),
    quantity: z.number(),
    price: z.string(),
});

const OrderSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string(),
    total_price: z.string(),
    financial_status: z.string().nullable(),
    customer: z.object({
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        phone: z.string().nullable(),
        email: z.string().nullable(),
    }).nullable(),
    shipping_address: z.object({
        address1: z.string().nullable(),
        city: z.string().nullable(),
        zip: z.string().nullable(),
        province: z.string().nullable(),
        country: z.string().nullable(),
    }).nullable(),
    line_items: z.array(LineItemSchema),
});

const OrdersResponseSchema = z.object({
    orders: z.array(OrderSchema),
});

const ProductSchema = z.object({
    id: z.number(),
    title: z.string(),
    vendor: z.string(),
    product_type: z.string(),
    variants: z.array(z.object({
        price: z.string()
    })),
});

const ProductsResponseSchema = z.object({
    products: z.array(ProductSchema),
});

const CollectionSchema = z.object({
    id: z.number(),
    title: z.string(),
});

const CollectionsResponseSchema = z.object({
    custom_collections: z.array(CollectionSchema).optional(),
    smart_collections: z.array(CollectionSchema).optional(),
});


export type Order = z.infer<typeof OrderSchema>;
export type ShopifyProduct = z.infer<typeof ProductSchema>;
export type ShopifyCollection = z.infer<typeof CollectionSchema>;


export type ShopifyProductInput = {
    title: string;
    body_html: string;
    product_type: string;
    vendor: string;
    variants: {
        price: number;
        option1?: string; // For size
        option2?: string; // For color
    }[];
    options?: { name: string; values: string[] }[];
    images: {
        attachment: string; // base64 encoded image data
    }[];
}

async function shopifyFetch(endpoint: string, options: RequestInit = {}) {
    if (!SHOPIFY_STORE_URL) {
        throw new Error("The SHOPIFY_STORE_URL environment variable is not set.");
    }
    if (!SHOPIFY_API_KEY) {
        throw new Error("The SHOPIFY_API_KEY environment variable is not set.");
    }
     if (!SHOPIFY_API_KEY.startsWith('shpat_')) {
        throw new Error("The SHOPIFY_API_KEY does not look like a valid Admin API access token. It should start with 'shpat_'. It should start with 'shpat_'.");
    }

    const url = `https://${SHOPIFY_STORE_URL}/admin/api/2023-10/${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_API_KEY,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            cache: 'no-store', 
        });
        
        if (!response.ok) {
            const errorBody = await response.json().catch(() => response.text());
            console.error(`Shopify API error: ${response.status} ${response.statusText}`, errorBody);
            // Try to extract a meaningful error from Shopify's response
            const shopifyError = (typeof errorBody === 'object' && errorBody.errors) ? JSON.stringify(errorBody.errors) : errorBody;
            throw new Error(`Shopify API Error (${response.status}): ${shopifyError}`);
        }

        return response.json();
    } catch (error: any) {
        // Catch network errors from fetch itself
        console.error("Network or fetch error calling Shopify API:", error);
        throw new Error(`Failed to connect to Shopify API: ${error.message}`);
    }
}

export async function getOrders(): Promise<Order[]> {
    try {
        const jsonResponse = await shopifyFetch('orders.json?status=any');
        const parsed = OrdersResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Shopify orders response:", parsed.error.toString());
            throw new Error("Failed to parse data from Shopify.");
        }

        return parsed.data.orders;
        
    } catch (error: any) {
        console.error("Error fetching Shopify orders from internal API:", error);
        // Re-throw the error so the client-side useToast can display it.
        throw error;
    }
}


export async function createProduct(product: ShopifyProductInput): Promise<any> {
    try {
        const response = await shopifyFetch('products.json', {
            method: 'POST',
            body: JSON.stringify({ product }),
        });
        return response.product;
    } catch (error: any) {
        // The detailed error is already logged in shopifyFetch, just re-throw.
        throw error;
    }
}

// These functions are now exposed via API routes and shouldn't be exported directly
// for client-side consumption to avoid leaking server-side environment variables.

async function getProducts(): Promise<ShopifyProduct[]> {
    try {
        const jsonResponse = await shopifyFetch('products.json?limit=250');
        const parsed = ProductsResponseSchema.safeParse(jsonResponse);

        if (!parsed.success) {
            console.error("Failed to parse Shopify products response:", parsed.error.toString());
            throw new Error("Failed to parse products from Shopify.");
        }
        return parsed.data.products;
    } catch (error: any) {
        console.error("Error fetching Shopify products:", error);
        throw error;
    }
}

async function getCollections(): Promise<ShopifyCollection[]> {
    try {
        const [customCollections, smartCollections] = await Promise.all([
            shopifyFetch('custom_collections.json?limit=250'),
            shopifyFetch('smart_collections.json?limit=250')
        ]);
        const parsedCustom = CollectionsResponseSchema.safeParse(customCollections);
        const parsedSmart = CollectionsResponseSchema.safeParse(smartCollections);

        let allCollections: ShopifyCollection[] = [];
        if (parsedCustom.success && parsedCustom.data.custom_collections) {
            allCollections = allCollections.concat(parsedCustom.data.custom_collections);
        }
        if (parsedSmart.success && parsedSmart.data.smart_collections) {
            allCollections = allCollections.concat(parsedSmart.data.smart_collections);
        }
        return allCollections;
    } catch (error: any) {
        console.error("Error fetching Shopify collections:", error);
        throw error;
    }
}

async function getVendors(): Promise<string[]> {
    try {
        const products = await getProducts();
        const vendors = new Set(products.map(p => p.vendor));
        return Array.from(vendors);
    } catch (error) {
        console.error("Error fetching vendors via products:", error);
        throw error;
    }
}

// Re-export for server-side use in API routes
export { getProducts, getCollections, getVendors };
    
