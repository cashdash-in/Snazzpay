
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.error("Razorpay API keys are not set in environment variables.");
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
        const { amount, customerName, customerContact, customerEmail, orderId, productName } = await request.json();
        
        if (!amount || !customerName || !customerContact || !customerEmail || !orderId || !productName) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields. Amount, customer details, order ID, and product name are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const paymentLinkRequest = {
            amount: Math.round(parseFloat(amount) * 100), // Amount in paise
            currency: "INR",
            description: `Authorization for Order: ${orderId}`,
            customer: {
                name: customerName,
                contact: customerContact,
                email: customerEmail
            },
            notify: {
                sms: true,
                email: true
            },
            notes: {
                product: productName,
                original_order_id: orderId,
            },
            // This is the key to ensure the transaction is an authorization.
            // By forcing the method to card, we can ensure it supports authorization.
            // This also prevents immediate debit via UPI.
            options: {
                checkout: {
                    method: {
                        card: true,
                    }
                }
            },
            // The purpose of the payment link is authorization
            // We set a callback URL for our own app to handle the success if needed in the future
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`,
            callback_method: 'get' as const
        };

        console.log("Creating Razorpay Payment Link with options:", JSON.stringify(paymentLinkRequest, null, 2));

        const paymentLink = await razorpay.paymentLink.create(paymentLinkRequest);

        console.log("Successfully created Razorpay Payment Link:", paymentLink);

        return NextResponse.json({ 
            success: true, 
            message: `Authorization link sent to ${customerEmail} and ${customerContact}.`,
            short_url: paymentLink.short_url 
        });

    } catch (error: any) {
        console.error("--- Razorpay Payment Link API Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create Razorpay Payment Link: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
