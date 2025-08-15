
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error('Razorpay API keys are not configured on the server.');
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function POST(req: NextRequest) {
  try {
    const { totalAmount } = await req.json();

    if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid total amount provided.' }, { status: 400 });
    }

    // Step 1: Create a Plan
    // A plan is required to create a subscription.
    // For an on-demand "charge at will" mandate, we create a long-term plan with a nominal amount.
    const planOptions = {
      period: 'yearly',
      interval: 10, // A long interval, like 10 years, for a long-lived mandate
      item: {
        name: 'SnazzPay On-Demand Mandate Plan',
        amount: 100, // Minimum amount (1 Rupee in paise) for plan creation
        currency: 'INR',
        description: 'Plan for authorizing future on-demand payments.',
      },
       notes: {
        plan_id: `plan_${uuidv4()}`
      }
    };

    const plan = await razorpay.plans.create(planOptions);

    // Step 2: Create a Subscription
    // Link the subscription to the plan and set the total charge limit.
    const subscriptionOptions = {
      plan_id: plan.id,
      total_count: 1, // This is for a single authorization cycle
      quantity: 1,
      customer_notify: 0, // We handle notifications
      // This is the maximum amount that can be charged for this mandate
      authorization_amount: totalAmount * 100, // Amount in paise
      notes: {
        order_purpose: 'On-demand payment authorization for COD',
      },
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    return NextResponse.json({ subscription_id: subscription.id });

  } catch (error: any) {
    console.error('Razorpay API Error:', error);
    // Provide a more specific error message if available
    const errorMessage = error.error?.description || error.message || 'An internal server error occurred.';
    return NextResponse.json({ error: `Failed to create Razorpay subscription: ${errorMessage}` }, { status: 500 });
  }
}
