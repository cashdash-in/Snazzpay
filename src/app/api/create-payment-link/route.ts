
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import nodemailer from 'nodemailer';
import { getDocument } from '@/services/firestore';

// Define a type for the payment settings
type PaymentSettings = {
    razorpay_key_id: string;
    razorpay_key_secret: string;
};

async function getRazorpayInstance(userId?: string, userRole?: 'seller' | 'vendor'): Promise<Razorpay> {
    let keyId: string | undefined;
    let keySecret: string | undefined;

    if (userId && userRole) {
        // Fetch credentials for a specific seller or vendor from Firestore
        const settings = await getDocument<PaymentSettings>(userRole + '_payment_settings', userId);
        if (settings) {
            keyId = settings.razorpay_key_id;
            keySecret = settings.razorpay_key_secret;
        }
    }

    // Fallback to admin/platform credentials if others are not found
    if (!keyId || !keySecret) {
        keyId = process.env.RAZORPAY_KEY_ID;
        keySecret = process.env.RAZORPAY_KEY_SECRET;
    }

    if (!keyId || !keySecret) {
        throw new Error("Server configuration error: Razorpay keys are missing.");
    }
    
    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}


export async function POST(request: Request) {
    const GMAIL_EMAIL = process.env.GMAIL_APP_EMAIL;
    const GMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

    try {
        const { 
            amount, 
            customerName, 
            customerContact, 
            customerEmail, 
            orderId, 
            productName, 
            isPartnerSettlement,
            isLimitIncrease,
            userId,
            userRole
        } = await request.json();
        
        const razorpay = await getRazorpayInstance(userId, userRole);

        if (isPartnerSettlement || isLimitIncrease) {
             if (!amount) {
                return new NextResponse(
                    JSON.stringify({ error: "Amount is required for this transaction." }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                );
            }
             // For Partner Pay settlement or limit increases, we create a simple order for payment collection
            const orderOptions = {
                amount: Math.round(amount * 100), // Amount in paise
                currency: 'INR',
                receipt: ('rcpt_' + (isPartnerSettlement ? 'partner_settle' : 'limit_inc') + '_' + Date.now()).slice(0, 40),
                notes: {
                    type: isPartnerSettlement ? "partner_settlement" : "limit_increase",
                    userName: customerName, // In this context, customerName is the partner/user's name
                }
            };
            const order = await razorpay.orders.create(orderOptions);
            return NextResponse.json({ order_id: order.id, isPartnerSettlement: true });
        }


        // Logic for sending customer payment links (existing functionality)
        if (!GMAIL_EMAIL || !GMAIL_PASSWORD) {
            return new NextResponse(
                JSON.stringify({ error: "Server configuration error: Gmail credentials are missing." }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        if (!APP_URL) {
            return new NextResponse(
                JSON.stringify({ error: "Server configuration error: NEXT_PUBLIC_APP_URL is not set." }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }
        if (!amount || !customerName || !customerContact || !customerEmail || !orderId || !productName) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields to create a payment link." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const secureUrl = APP_URL + '/secure-cod?amount=' + encodeURIComponent(amount) + '&name=' + encodeURIComponent(productName) + '&order_id=' + encodeURIComponent(orderId);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: GMAIL_EMAIL,
                pass: GMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: '"Snazzify" <' + GMAIL_EMAIL + '>',
            to: customerEmail,
            subject: 'Action Required: Complete Your Snazzify Order #' + orderId,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Complete Your Order #${orderId}</h2>
                    <p>Dear ${customerName},</p>
                    <p>We noticed you started the confirmation process for your order but didn't complete the final payment. To finalize your Secure COD order for <strong>${productName}</strong> (Value: ₹${amount}), please complete the payment by clicking the link below.</p>
                    <a href="${secureUrl}" style="background-color: #663399; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Complete Secure Payment</a>
                    <p><strong>Remember, this is not a regular online payment.</strong> With Secure COD, your funds are held safely in a Trust Wallet and only released to us after your order is dispatched. Completing this step also makes you eligible for our <strong>Shakti Card</strong> loyalty program, giving you access to future rewards and discounts.</p>
                    <p>If you have any questions, please contact our support team at <a href="mailto:customer.service@snazzify.co.in">customer.service@snazzify.co.in</a> or message us on WhatsApp at 9920320790.</p>
                    <p>Thank you,<br/>The Snazzify Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        return NextResponse.json({ success: true, message: "A reminder to complete the order has been sent to " + customerEmail + "." });

    } catch (error: any) {
        console.error("--- Create Payment Link/Order Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: "Failed to process request: " + errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
