
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

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
        const { paymentId, amount } = await request.json();

        if (!paymentId || !amount) {
            return new NextResponse(
                JSON.stringify({ error: "Payment ID and amount are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // The paymentId from the authorization step is the one we need to capture.
        const capturedPayment = await razorpay.payments.capture(paymentId, Math.round(amount * 100), 'INR');

        console.log("Successfully captured payment:", capturedPayment);

        return NextResponse.json({ success: true, transactionId: capturedPayment.id });

    } catch (error: any) {
        console.error("--- Razorpay Payment Capture Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: "Failed to capture payment: " + errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
