
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
        const { paymentId, amount, reason } = await request.json();

        if (!paymentId || !amount) {
            return new NextResponse(
                JSON.stringify({ error: "Payment ID and refund amount are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Razorpay expects amount in the smallest currency unit (paise for INR)
        const amountInPaise = Math.round(parseFloat(amount) * 100);

        const refund = await razorpay.payments.refund(paymentId, {
            amount: amountInPaise,
            speed: 'normal', // Can be 'normal' or 'optimum'
            notes: {
                reason: reason || "Refund processed from SnazzPay dashboard."
            },
            receipt: 'refund-receipt-' + paymentId
        });
        
        console.log("Successfully processed refund:", refund);
        
        return NextResponse.json({ success: true, message: 'Refund of ₹' + amount + ' processed successfully.', refundId: refund.id });

    } catch (error: any) {
        console.error("--- Razorpay Refund Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: "Failed to process refund: " + errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
