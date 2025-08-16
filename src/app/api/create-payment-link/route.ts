
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
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app-url.com';

        const paymentLinkOptions = {
            amount: Math.round(parseFloat(amount) * 100), // Amount in paise
            currency: "INR",
            accept_partial: false,
            description: `Payment for Order: ${orderId} (${productName})`,
            customer: {
                name: customerName,
                contact: customerContact,
                email: customerEmail || undefined, // Pass email if available
            },
            notify: {
                sms: true,
                email: !!customerEmail // Send email only if it's provided
            },
            reminder_enable: true,
            notes: {
                order_id: orderId,
                product_name: productName,
            },
            callback_url: `${appUrl}/orders/${orderId}`, // Redirect user after payment
            callback_method: "get" as const
        };

        const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
        
        // Notify via WhatsApp
        if (paymentLink.short_url) {
            await razorpay.paymentLink.notifyBy(paymentLink.id, 'whatsapp');
        }
        
        console.log("Successfully created and sent Razorpay Payment Link:", paymentLink);

        let notificationMessage = `Payment link sent via SMS and WhatsApp to ${customerContact}.`;
        if (customerEmail) {
            notificationMessage = `Payment link sent via Email, SMS, and WhatsApp to ${customerContact}.`;
        }


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
