
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
    try {
        const { amount, productName } = await request.json();

        // Step 1: Create a Plan for the eMandate (e.g., for ₹1)
        // A unique plan is created for each request to avoid plan conflicts.
        const planOptions = {
            period: 'yearly' as const, // Mandates are typically long-term
            interval: 10, // Recurring every 10 years (effectively a one-time mandate setup)
            item: {
                name: `eMandate authorization for ${productName}`,
                amount: 100, // Authorize for ₹1 (100 paise)
                currency: 'INR',
                description: 'Authorization for Secure COD',
            },
            notes: {
                product: productName
            }
        };

        const plan = await razorpay.plans.create(planOptions);

        // Step 2: Create a Subscription using the Plan
        const subscriptionOptions = {
            plan_id: plan.id,
            total_count: 1, // This is for the initial authorization charge. The mandate itself is long-lived.
            quantity: 1,
            customer_notify: 0, // We will handle notifications
            notes: {
                product: productName,
                original_amount: amount,
            }
        };

        const subscription = await razorpay.subscriptions.create(subscriptionOptions);

        return NextResponse.json({ subscription_id: subscription.id });

    } catch (error) {
        console.error('Failed to create Razorpay subscription:', error);
        let errorMessage = 'An internal server error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return new NextResponse(
            JSON.stringify({ error: 'Failed to create Razorpay subscription: ' + errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
