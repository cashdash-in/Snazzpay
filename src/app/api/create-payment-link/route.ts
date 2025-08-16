
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

        if (!amount || !customerName || !customerContact || !orderId) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields: amount, customerName, customerContact, orderId" }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://snazzpay.apphosting.page';

        const paymentLinkOptions = {
            amount: Math.round(parseFloat(amount) * 100), // Amount in paise
            currency: "INR",
            accept_partial: false,
            description: `Payment for Order: ${orderId} (${productName})`,
            customer: {
                name: customerName,
                contact: customerContact,
                email: customerEmail || undefined,
            },
            notify: {
                sms: true,
                email: !!customerEmail,
                whatsapp: true
            },
            reminder_enable: true,
            notes: {
                order_id: orderId,
                product_name: productName,
            },
            callback_url: `${appUrl}/orders/${orderId}`,
            callback_method: "get" as const
        };

        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
        
        console.log("Successfully created Razorpay Payment Link:", paymentLink);

        let sentTo = ['SMS', 'WhatsApp'];
        if (customerEmail) {
            sentTo.push('Email');
        }
        const notificationMessage = `Payment link sent to ${customerContact} via ${sentTo.join(', ')}.`;

        return NextResponse.json({
            success: true,
            message: notificationMessage
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
