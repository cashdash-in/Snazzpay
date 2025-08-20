
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const GMAIL_EMAIL = process.env.GMAIL_APP_EMAIL;
    const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    if (!keyId || !keySecret) {
        return new NextResponse(
            JSON.stringify({ error: "Server configuration error: Razorpay keys are missing." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
     if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
        return new NextResponse(
            JSON.stringify({ error: "Server configuration error: Gmail credentials are missing." }),
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
                JSON.stringify({ error: "Missing required fields to create a payment link." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // The secureUrl now points back to the main Secure COD page with all parameters filled
        const secureUrl = `${APP_URL}/secure-cod?amount=${encodeURIComponent(amount)}&name=${encodeURIComponent(productName)}&order_id=${encodeURIComponent(orderId)}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_EMAIL,
                pass: GMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: `"Snazzify" <${GMAIL_EMAIL}>`,
            to: customerEmail,
            subject: `Reminder: Complete Your Snazzify Order #${orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Complete Your Order #${orderId}</h2>
                    <p>Dear ${customerName},</p>
                    <p>We noticed you started the confirmation process for your order but didn't complete it. To finalize your Secure COD order, please complete the payment by clicking the link below. </p>
                    <p><strong>This is a modern, secure way to pay.</strong> Your funds are held securely in your personal Snazzify Trust Wallet and are only transferred to us after your product is dispatched. You can cancel anytime before dispatch for a full refund.</p>
                    <p><strong>Order Details:</strong></p>
                    <ul>
                        <li><strong>Product:</strong> ${productName}</li>
                        <li><strong>Amount:</strong> ₹${amount}</li>
                    </ul>
                    <a href="${secureUrl}" style="background-color: #663399; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Complete Secure Payment</a>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Thank you,<br/>The Snazzify Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        return NextResponse.json({ success: true, message: `A reminder to complete the order has been sent to ${customerEmail}.` });

    } catch (error: any) {
        console.error("--- Create Payment Link Error ---");
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
