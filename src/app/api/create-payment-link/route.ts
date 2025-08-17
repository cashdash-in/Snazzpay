
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
        const { amount, productName, orderId, customerName, customerContact, customerEmail } = await request.json();

        if (!amount || !productName || !orderId || !customerName || !customerContact) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://snazzpay.apphosting.page';
        
        // 1. Create a Razorpay Order first, for authorization only
        const orderOptions = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            payment_capture: 0, // IMPORTANT: This makes it an authorization
            receipt: `rcpt_auth_${orderId}`.slice(0, 40),
            notes: {
                product: productName,
                originalOrderId: orderId,
                type: "secure_cod_card_authorization_link"
            }
        };

        const razorpayOrder = await razorpay.orders.create(orderOptions);

        // 2. Create a Payment Link associated with that order
        const paymentLinkOptions = {
            description: `Click to authorize payment for ${productName}`,
            customer: {
                name: customerName,
                contact: customerContact,
                email: customerEmail,
            },
            notes: {
                product: productName,
                originalOrderId: orderId
            },
            order_id: razorpayOrder.id,
            callback_url: `${appUrl}/orders`,
            callback_method: 'get',
            notify: {
                sms: true,
                email: true,
                whatsapp: true
            },
            'options[checkout][method][upi]': 0, // Disable UPI to enforce card auth
        };

        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions as any);
        
        return NextResponse.json({
            success: true,
            message: `Authorization link sent to ${customerContact} and ${customerEmail || 'their email'}.`,
            paymentLink: paymentLink.short_url
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
            JSON.stringify({ error: `Failed to create Razorpay payment link: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
