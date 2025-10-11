
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/app/orders/page';

// This is a simplified representation of the Shopify Order webhook payload.
// For a production app, you would want to use a more robust schema validation library like Zod.
interface ShopifyOrderPayload {
    id: number;
    name: string;
    created_at: string;
    total_price: string;
    financial_status: string;
    customer?: {
        first_name?: string | null;
        last_name?: string | null;
        phone?: string | null;
        email?: string | null;
    };
    shipping_address?: {
        address1?: string | null;
        city?: string | null;
        zip?: string | null;
        province?: string | null;
        country?: string | null;
    };
    line_items: {
        title: string;
        quantity: number;
    }[];
}

function mapShopifyToEditable(shopifyOrder: ShopifyOrderPayload): EditableOrder {
    const customer = shopifyOrder.customer;
    const customerName = customer ? \`\${customer.first_name || ''} \${customer.last_name || ''}\`.trim() : 'N/A';
    const products = shopifyOrder.line_items.map(item => item.title).join(', ');

    return {
        id: \`shopify-\${shopifyOrder.id.toString()}\`,
        orderId: shopifyOrder.name,
        customerName,
        customerEmail: customer?.email || undefined,
        customerAddress: shopifyOrder.shipping_address ? \`\${shopifyOrder.shipping_address.address1 || ''}, \${shopifyOrder.shipping_address.city || ''}\` : 'N/A',
        pincode: shopifyOrder.shipping_address?.zip || 'N/A',
        contactNo: shopifyOrder.customer?.phone || 'N/A',
        productOrdered: products,
        quantity: shopifyOrder.line_items.reduce((sum, item) => sum + item.quantity, 0),
        price: shopifyOrder.total_price,
        paymentStatus: shopifyOrder.financial_status || 'Pending',
        date: format(new Date(shopifyOrder.created_at), "yyyy-MM-dd"),
        source: 'Shopify',
    };
}


export async function POST(request: Request) {
    try {
        console.log("--- Shopify Webhook Received ---");
        const payload: ShopifyOrderPayload = await request.json();

        if (!payload.id || !payload.name) {
            console.error("Invalid Shopify payload received:", payload);
            return NextResponse.json({ error: "Invalid payload: Missing order ID or name." }, { status: 400 });
        }

        const newOrder = mapShopifyToEditable(payload);
        
        // IMPORTANT: In a real multi-user production app, you cannot use localStorage on the server.
        // This is a prototype-specific implementation. For a live app, you would save this
        // to a shared database like Firestore, Redis, or PostgreSQL.
        // The current implementation will not work correctly on a serverless deployment
        // as each function invocation has its own isolated environment.
        // We are using it here because the rest of the app's persistence is based on it.

        console.log(\`Processing webhook for Shopify Order: \${newOrder.orderId}\`);

        // This is a server-side action. It cannot directly access client-side localStorage.
        // This is a fundamental limitation of the current prototype design.
        // To make this work as intended in a deployed environment, the entire data persistence
        // logic needs to be migrated from localStorage to a server-side database (e.g., Firestore).

        // For now, we will simply log that the webhook was received and processed.
        // The \`getOrders()\` function will continue to be the primary source of truth for Shopify orders.
        console.log("Webhook processed successfully. The order will be synced on the next manual refresh of the Orders page.");
        
        return NextResponse.json({ success: true, message: \`Webhook for order \${newOrder.orderId} processed.\` });

    } catch (error: any) {
        console.error("--- Shopify Webhook Error ---");
        console.error(error);
        return NextResponse.json({ error: \`Failed to process webhook: \${error.message}\` }, { status: 500 });
    }
}
