
'use server';

import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type { EditableOrder } from '@/app/orders/page';

const GMAIL_EMAIL = process.env.GMAIL_APP_EMAIL;
const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function getEmailContent(type: string, order: EditableOrder) {
    let subject = '';
    let html = '';
    const supportInfo = `<p>If you have any questions, please contact our support team at <a href="mailto:customer.service@snazzify.co.in">customer.service@snazzify.co.in</a> or message us on WhatsApp at 9920320790.</p>`;
    const shaktiCardInfo = `<p style="font-size: 12px; color: #555; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">Your <strong>Shakti Card</strong> is active! Use it with our Partner Pay agents to get exclusive discounts and rewards on your next purchase.</p>`;

    switch (type) {
        case 'dispatch':
            subject = 'Shipped! Your Snazzify Order #' + order.orderId + ' is on its way.';
            html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Your Order is on its way!</h2>
                    <p>Dear ${order.customerName},</p>
                    <p>Great news! Your order #${order.orderId} for <strong>${order.productOrdered}</strong> has been dispatched. As part of our Secure COD process, the funds held in your Trust Wallet have now been transferred to us.</p>
                    <p><strong>Tracking Details:</strong></p>
                    <ul>
                        <li><strong>Courier:</strong> ${order.courierCompanyName || 'Our Logistics Partner'}</li>
                        <li><strong>Tracking Number:</strong> ${order.trackingNumber}</li>
                        <li><strong>Estimated Delivery:</strong> ${order.estDelivery || '3-7 business days'}</li>
                    </ul>
                    <p>You can typically start tracking your order within 24 hours.</p>
                    ${shaktiCardInfo}
                    ${supportInfo}
                    <p>Thank you for shopping with us,<br/>The Snazzify Team</p>
                </div>
            `;
            break;
        case 'cancellation':
            subject = 'Confirmation of Cancellation for Order #' + order.orderId;
            html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Order Cancellation Confirmed</h2>
                    <p>Dear ${order.customerName},</p>
                    <p>This email confirms that your order #${order.orderId} for <strong>${order.productOrdered}</strong> has been successfully cancelled as per your request.</p>
                    <p>The payment authorization for ₹${order.price} has been voided, and the funds have been released back to your account. You will not be charged.</p>
                    <p style="font-size: 12px; color: #555; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">We are sorry to see you go. Your Shakti Card remains active for any future purchases, giving you access to exclusive rewards.</p>
                    ${supportInfo}
                    <p>We hope to see you again soon,<br/>The Snazzify Team</p>
                </div>
            `;
            break;
        case 'refund':
             subject = 'Refund Processed for Order #' + order.orderId;
             html = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Refund Processed</h2>
                    <p>Dear ${order.customerName},</p>
                    <p>We have processed a refund for your order #${order.orderId} for the product <strong>${order.productOrdered}</strong>.</p>
                    <p><strong>Refund Amount:</strong> ₹${order.refundAmount || order.price}</p>
                    <p>Please allow 5-7 business days for the amount to reflect in your original payment account. The exact time can vary depending on your bank.</p>
                    ${shaktiCardInfo}
                    ${supportInfo}
                    <p>Thank you,<br/>The Snazzify Team</p>
                </div>
            `;
            break;
        default:
            throw new Error('Invalid notification type specified.');
    }
    return { subject, html };
}

export async function POST(request: Request) {
    if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
        return new NextResponse(
            JSON.stringify({ error: "Email service is not configured on the server. Please set GMAIL_APP_EMAIL and GMAIL_APP_PASSWORD." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
    
    try {
        const { order, type, recipientEmail, subject: internalSubject, body: internalBody }: { order?: EditableOrder, type: string, recipientEmail?: string, subject?: string, body?: string } = await request.json();
        
        let subject = '';
        let html = '';
        let recipient: string | undefined;

        if (type === 'internal_alert') {
            if (!recipientEmail || !internalSubject || !internalBody) {
                 return new NextResponse(
                    JSON.stringify({ error: "Missing recipient, subject, or body for internal alert." }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            subject = internalSubject;
            html = internalBody;
            recipient = recipientEmail;
        } else {
             if (!order || !order.customerEmail) {
                 return new NextResponse(
                    JSON.stringify({ error: "Missing order data or customer email for customer notification." }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            const content = getEmailContent(type, order);
            subject = content.subject;
            html = content.html;
            recipient = order.customerEmail;
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_EMAIL,
                pass: GMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: '"Snazzify" <' + GMAIL_EMAIL + '>',
            to: recipient,
            subject: subject,
            html: html,
        };

        await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, message: "A '" + type + "' notification email has been sent to " + recipient + "." });

    } catch (error: any) {
        console.error("Nodemailer error:", error);
        if (error.code === 'EAUTH') {
             return new NextResponse(
                JSON.stringify({ error: "Failed to send email: Incorrect Gmail credentials. Please double-check your GMAIL_APP_EMAIL and GMAIL_APP_PASSWORD in your hosting environment variables. Ensure the password is the 16-digit App Password from Google, not your regular password." }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return new NextResponse(
            JSON.stringify({ error: "Failed to send email: " + error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
