
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
        const { orderId, cancellationId } = await request.json();

        if (!orderId || !cancellationId) {
            return new NextResponse(
                JSON.stringify({ error: "Order ID and Cancellation ID are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // In a real app, you'd fetch this from a database.
        // For this app, we're simulating by checking local storage data that we assume the API has access to.
        // This is a conceptual stand-in. The client should pass up the necessary data.
        
        // The client must find the order and its payment info and pass it up.
        // The following is a placeholder for how you would find the order based on IDs.
        // We'll trust the client to pass the paymentId for now.

        const paymentInfoJSON = `payment_info_${orderId}`; // This is a conceptual key
        // You would need a way to look up the real paymentId.
        // For now, we assume client may pass it, or we find it from a DB.

        // This is a simplified check. A robust system would query a database for the order
        // and its associated cancellationId.
        console.log(`Attempting to cancel Order: ${orderId} with Cancellation ID: ${cancellationId}`);

        // Since we can't access localStorage on the server, we rely on a conceptual check.
        // The real implementation would be to look up the order in a DB via its `orderId`
        // and check if `cancellationId` matches.

        // Let's assume the client passes up the paymentId associated with the authorization.
        const { paymentId, amount } = await request.json(); // The client needs to send this.

        if(!paymentId) {
             return new NextResponse(
                JSON.stringify({ error: "Could not find a valid payment authorization for this order to cancel/refund." }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Refund the full authorized amount. This effectively cancels the hold.
        const refund = await razorpay.payments.refund(paymentId, {
            amount: Math.round(amount * 100),
            speed: 'normal',
            notes: {
                reason: `Customer cancellation with ID: ${cancellationId}`
            }
        });
        
        console.log("Successfully processed refund/cancellation:", refund);
        
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
            JSON.stringify({ error: `Failed to cancel order: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
