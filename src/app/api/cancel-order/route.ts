
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import type { EditableOrder } from '@/app/orders/page';

export async function POST(request: Request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return new NextResponse(
            JSON.stringify({ error: "Server configuration error: Razorpay keys are missing." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    try {
        const { orderId, cancellationId, paymentId, amount } = await request.json();

        if (!orderId || !cancellationId) {
            return new NextResponse(
                JSON.stringify({ error: "Order ID and Cancellation ID are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // In a real app, you would look up the order in a database using the orderId and
        // verify that the cancellationId matches. Here we trust the client to pass the correct paymentId.
        
        if(!paymentId) {
             return new NextResponse(
                JSON.stringify({ error: "Could not find a valid payment authorization for this order to cancel/refund." }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Refunding the full authorized amount on an uncaptured payment effectively voids it.
        const refund = await razorpay.payments.refund(paymentId, {
            amount: Math.round(amount * 100),
            speed: 'normal',
            notes: {
                reason: \`Customer cancellation with ID: \${cancellationId}\`
            },
            receipt: \`receipt-cancel-\${orderId}\`
        });
        
        console.log("Successfully processed refund/cancellation (void):", refund);
        
        // You would now update your database to mark the order as 'Voided' or 'Cancelled'.

        return NextResponse.json({ success: true, message: 'Your order has been successfully cancelled. The payment authorization has been voided.' });

    } catch (error: any) {
        console.error("--- Razorpay Cancellation/Refund Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: \`Failed to cancel order: \${errorMessage}\` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
