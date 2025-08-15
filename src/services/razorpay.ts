
'use server';

import { z } from 'zod';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const PaymentLinkResponseSchema = z.object({
    id: z.string(),
    short_url: z.string(),
});

export async function createSubscriptionLink(maxAmount: number, description: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            throw new Error('Razorpay API keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        }

        const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
        
        const now = Math.floor(Date.now() / 1000);
        const expireBy = now + (10 * 60); // Link expires in 10 minutes

        const paymentLinkPayload = {
            amount: 100, // Mandate registration is for Re. 1
            currency: "INR",
            description: `Mandate for: ${description}`,
            expire_by: expireBy,
            customer: {
                name: "Secure COD Customer",
                email: "secure.cod@example.com",
                contact: "+919000090000"
            },
            subscription_registration: {
                method: "card",
                max_amount: maxAmount, // The actual maximum amount for future charges
                total_count: 120, // Authorize for 10 years (12 * 10)
            },
            upi_qr: 1, // Required parameter
            notes: {
                policy_name: "Secure COD Mandate"
            },
            callback_url: "https://snazzify.co.in/payment-success",
            callback_method: "get"
        };
        

        const response = await fetch('https://api.razorpay.com/v1/payment_links', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentLinkPayload),
            cache: 'no-store',
        });
        
        const jsonResponse = await response.json();

        if (!response.ok) {
            console.error("Razorpay Payment Link API Error:", jsonResponse);
            throw new Error(jsonResponse?.error?.description || 'Failed to create Razorpay payment link');
        }

        const parsed = PaymentLinkResponseSchema.safeParse(jsonResponse);
        if (!parsed.success) {
            console.error("Failed to parse Razorpay payment link response:", parsed.error.flatten());
            return { success: false, error: "Could not create mandate link due to unexpected response from Razorpay." };
        }

        return { success: true, url: parsed.data.short_url };
    } catch (error: any) {
        console.error("Error creating Razorpay subscription link:", error);
        return { success: false, error: error.message || "An unexpected error occurred while creating the mandate link." };
    }
}
