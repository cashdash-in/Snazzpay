
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// The SMS sending function has been removed as the free provider (textbelt.com)
// does not support sending messages to India. We now recommend using email or
// manually copying the link.

async function sendEmail(recipient: string, name: string, productName: string, url: string) {
    const { GMAIL_APP_EMAIL, GMAIL_APP_PASSWORD } = process.env;

    if (!GMAIL_APP_EMAIL || !GMAIL_APP_PASSWORD) {
        throw new Error("Email service is not configured on the server. Please set GMAIL_APP_EMAIL and GMAIL_APP_PASSWORD.");
    }
    
    // For using Gmail, you need to set up an "App Password"
    // See: https://support.google.com/accounts/answer/185833
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_APP_EMAIL,
            pass: GMAIL_APP_PASSWORD,
        },
    });

    const mailOptions = {
        from: `"Snazzify" <${GMAIL_APP_EMAIL}>`,
        to: recipient,
        subject: `Confirm your Secure COD Order for ${productName}`,
        html: `
            <p>Hi ${name},</p>
            <p>Thank you for your order! Please confirm your Secure Cash on Delivery order by clicking the link below:</p>
            <p><a href="${url}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #5a31f4; text-decoration: none; border-radius: 5px;">Confirm Your Order</a></p>
            <p>If you did not place this order, please disregard this email.</p>
            <br/>
            <p>Thanks,</p>
            <p>The Snazzify Team</p>
        `
    };

    return transporter.sendMail(mailOptions);
}


export async function POST(request: Request) {
    try {
        const { 
            amount, 
            productName, 
            orderId, 
            customerName,
            customerContact, 
            customerEmail,
            sendMethod // 'sms' or 'email'
        } = await request.json();

        if (!amount || !productName || !orderId || !customerName) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required order fields." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://snazzpay.apphosting.page';
        
        // Construct the URL to our own secure-cod page
        const secureCodUrl = new URL(`${appUrl}/secure-cod`);
        secureCodUrl.searchParams.set('amount', amount.toString());
        secureCodUrl.searchParams.set('name', productName);
        secureCodUrl.searchParams.set('order_id', orderId);

        const secureUrlString = secureCodUrl.toString();

        if (sendMethod === 'sms') {
             return new NextResponse(
                JSON.stringify({ error: "SMS service is currently unavailable. Please use email or copy the link." }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );

        } else if (sendMethod === 'email') {
            if (!customerEmail) {
                return new NextResponse(
                    JSON.stringify({ error: "Customer email is required for sending email." }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
            await sendEmail(customerEmail, customerName, productName, secureUrlString);
            return NextResponse.json({
                success: true,
                message: `Authorization link sent via Email to ${customerEmail}.`
            });
        } else {
             return new NextResponse(
                JSON.stringify({ error: "Invalid send method specified." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

    } catch (error: any) {
        console.error("--- Send Auth Link Error ---");
        console.error(error);
        const errorMessage = error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to send auth link: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
