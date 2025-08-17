
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
        
        // Step 1: Create an Order with payment_capture = 0 to make it an authorization
        const orderOptions = {
            amount: Math.round(parseFloat(amount) * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_auth_${orderId.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`.slice(0, 40),
            payment_capture: 0, // This is the key change to make it an authorization
        };

        const razorpayOrder = await razorpay.orders.create(orderOptions);

        // Step 2: Create a Payment Link associated with the authorization order
        const paymentLinkMessage = `Click to authorize payment for your order '${productName}' from Snazzify. Your card will not be charged now.`;

        const paymentLinkOptions = {
            // Amount and currency are taken from the order, so we do not pass them here.
            // This was the source of the "extra fields" error.
            order_id: razorpayOrder.id, // Associate the link with the authorization order
            description: paymentLinkMessage,
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
                "Order ID": orderId,
                "Product Name": productName,
                "Transaction Type": "Secure COD Authorization"
            },
            callback_url: `${appUrl}/orders/${orderId}`,
            callback_method: "get" as const,
            expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
        };
        
        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
        
        console.log("Successfully created Razorpay Authorization Payment Link.", paymentLink);

        let sentTo = ['SMS', 'WhatsApp'];
        if (customerEmail) {
            sentTo.push('Email');
        }
        const notificationMessage = `Authorization link sent to ${customerContact} via ${sentTo.join(', ')}.`;

        return NextResponse.json({
            success: true,
            message: notificationMessage,
            paymentLink: paymentLink.short_url
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
