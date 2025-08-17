
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';


async function createRazorpayLink(order: {
    amount: number,
    productName: string,
    orderId: string,
    customerName: string,
    customerContact: string,
    customerEmail: string
}) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Server configuration error: Razorpay keys are missing.");
    }
    
    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    const paymentLinkOptions = {
        amount: Math.round(order.amount * 100),
        currency: "INR",
        accept_partial: false,
        description: `Card Authorization for: ${order.productName} (Order: ${order.orderId})`,
        customer: {
            name: order.customerName,
            email: order.customerEmail,
            contact: order.customerContact,
        },
        notify: {
            sms: false, // We will handle notifications manually to provide better feedback
            email: false,
        },
        reminder_enable: false,
        reference_id: order.orderId,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order.orderId}`, // A placeholder URL
        callback_method: "get" as "get",
        options: {
            checkout: {
                name: "Snazzify Secure COD",
                method: {
                    card: true,
                    netbanking: false,
                    wallet: false,
                    upi: false, // CRITICAL: Force card for authorization flow
                }
            }
        }
    };
    
    const paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
    return paymentLink.short_url;
}


async function sendEmail(recipient: string, name: string, productName: string, url: string) {
    const { GMAIL_APP_EMAIL, GMAIL_APP_PASSWORD } = process.env;

    if (!GMAIL_APP_EMAIL || !GMAIL_APP_PASSWORD) {
        throw new Error("Email service is not configured on the server. Please set GMAIL_APP_EMAIL and GMAIL_APP_PASSWORD.");
    }
    
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
            <p>Thank you for your order! Please complete the card authorization for your Secure Cash on Delivery order by clicking the link below:</p>
            <p><a href="${url}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; background-color: #5a31f4; text-decoration: none; border-radius: 5px;">Authorize Your Order</a></p>
            <p>This is not a payment. It is a temporary hold that will be released upon successful delivery.</p>
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
            sendMethod // 'email' or 'copy'
        } = await request.json();

        if (!amount || !productName || !orderId || !customerName || !customerEmail || !customerContact) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required order fields." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const secureUrlString = await createRazorpayLink({amount, productName, orderId, customerName, customerContact, customerEmail});

        if (sendMethod === 'email') {
            await sendEmail(customerEmail, customerName, productName, secureUrlString);
            return NextResponse.json({
                success: true,
                message: `Authorization link sent via Email to ${customerEmail}.`
            });
        } else if (sendMethod === 'copy') {
             return NextResponse.json({
                success: true,
                message: `Link copied to clipboard.`,
                url: secureUrlString,
            });
        }
        else {
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
