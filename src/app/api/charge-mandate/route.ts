
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

        // The paymentId from the authorization step is actually the token for charging.
        const paymentToken = paymentId; 
        
        // First, fetch the payment to get the customer ID associated with the token
        const payment = await razorpay.payments.fetch(paymentToken);
        if (!payment || !payment.customer_id) {
            throw new Error('Could not find a customer associated with this payment token.');
        }
        const customerId = payment.customer_id;
        
        // Create a subsequent payment against the token
        const charge = await razorpay.payments.create({
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            customer_id: customerId,
            payment_capture: 1, // Auto-capture the payment
            receipt: `rcpt_charge_${uuidv4().substring(0,8)}`,
            // This is the crucial part for charging a mandate
            token: paymentToken, 
            description: `Charging mandate for order.`,
             notes: {
                charge_reason: "Order dispatched"
            }
        });

        console.log("Successfully charged mandate:", charge);

        return NextResponse.json({ success: true, transactionId: charge.id });

    } catch (error: any) {
        console.error("--- Razorpay Mandate Charge Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to charge mandate: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
