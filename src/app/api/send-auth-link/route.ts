
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { EditableOrder } from '@/app/orders/page';

export async function POST(request: Request) {
    const { order, method }: { order: EditableOrder, method: 'email' } = await request.json();

    const GMAIL_EMAIL = process.env.GMAIL_APP_EMAIL;
    const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

    if (method === 'email') {
        if (!order.customerEmail) {
             return new NextResponse(
                JSON.stringify({ error: "Customer email address is missing." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
            return new NextResponse(
                JSON.stringify({ error: "Email service is not configured on the server." }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_EMAIL,
                pass: GMAIL_PASSWORD,
            },
        });
        
        const secureUrl = `${APP_URL}/secure-cod?amount=${encodeURIComponent(order.price)}&name=${encodeURIComponent(order.productOrdered)}&order_id=${encodeURIComponent(order.orderId)}`;

        const mailOptions = {
            from: `"Snazzify" <${GMAIL_EMAIL}>`,
            to: order.customerEmail,
            subject: `Action Required: Confirm Your Snazzify Order #${order.orderId}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Confirm Your Order #${order.orderId}</h2>
                    <p>Dear ${order.customerName},</p>
                    <p>Thank you for your order. To confirm your order and ensure faster processing, please complete the secure payment by clicking the link below.</p>
                    <p><strong>This is a modern, secure payment method.</strong> Your funds will be held in your personal Snazzify Trust Wallet. The amount is only transferred to us after your product has been dispatched. You can cancel your order anytime before dispatch for a full refund (less a small service fee).</p>
                    <p><strong>Order Details:</strong></p>
                    <ul>
                        <li><strong>Product:</strong> ${order.productOrdered}</li>
                        <li><strong>Amount:</strong> ₹${order.price}</li>
                    </ul>
                    <a href="${secureUrl}" style="background-color: #663399; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Complete Secure Payment</a>
                    <p>If you did not place this order, please disregard this email.</p>
                    <p>Thank you,<br/>The Snazzify Team</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            return NextResponse.json({ success: true, message: `Authorization link sent to ${order.customerEmail}.` });
        } catch (error: any) {
            console.error("Nodemailer error:", error);
            // Provide a more specific error if it's an authentication issue.
            if (error.code === 'EAUTH') {
                 return new NextResponse(
                    JSON.stringify({ error: `Failed to send email: Incorrect Gmail credentials. Please double-check your GMAIL_APP_EMAIL and GMAIL_APP_PASSWORD in your hosting environment variables. Ensure the password is the 16-digit App Password from Google, not your regular password.` }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }
            return new NextResponse(
                JSON.stringify({ error: `Failed to send email: ${error.message}` }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    return new NextResponse(
        JSON.stringify({ error: "Invalid send method specified." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
}
