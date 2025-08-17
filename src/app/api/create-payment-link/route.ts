
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
        const { amount, productName, customerName, customerEmail, customerContact, orderId } = await request.json();

        const paymentLinkOptions = {
            amount: Math.round(amount * 100),
            currency: "INR",
            accept_partial: false,
            description: `Card Authorization for: ${productName}`,
            customer: {
                name: customerName,
                email: customerEmail,
                contact: customerContact,
            },
            notify: {
                sms: true,
                email: true,
            },
            reminder_enable: true,
            reference_id: orderId,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders`, // A URL to redirect to after payment
            callback_method: "get" as "get",
            options: {
                checkout: {
                    name: "Snazzify Secure COD",
                    method: {
                        card: true,
                        netbanking: false, // Disabling other methods to encourage card auth
                        wallet: false,
                        upi: false, // CRITICAL: This forces card usage for authorization
                    }
                }
            }
        };

        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
        
        return NextResponse.json({
            success: true,
            message: `Authorization link sent to ${customerContact} & ${customerEmail}.`,
            url: paymentLink.short_url,
        });

    } catch (error: any) {
        console.error("--- Razorpay Payment Link Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create payment link: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
