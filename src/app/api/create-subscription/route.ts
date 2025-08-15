
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

    const planOptions = {
      period: 'yearly' as const,
      interval: 10,
      item: {
        name: 'SnazzPay On-Demand Mandate Plan',
        amount: 100, 
        currency: 'INR',
        description: 'Plan for authorizing future on-demand payments.',
      },
       notes: {
        plan_id: `plan_${uuidv4()}`
      }
    };

    const plan = await razorpay.plans.create(planOptions);

    if (!plan) {
      return NextResponse.json({ error: 'Failed to create Razorpay plan.' }, { status: 500 });
    }

    const subscriptionOptions = {
      plan_id: plan.id,
      total_count: 1, 
      quantity: 1,
      customer_notify: 0,
      authorization_amount: totalAmount * 100, // Amount in paise
      notes: {
        order_purpose: 'On-demand payment authorization for COD',
      },
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    if (!subscription) {
        return NextResponse.json({ error: 'Failed to create Razorpay subscription object.' }, { status: 500 });
    }

    return NextResponse.json({ subscription_id: subscription.id });

  } catch (error: any) {
    console.error('Razorpay API Error:', error);
    // Correctly extract error message from Razorpay's SDK error object
    const errorMessage = error.description || error.message || 'An internal server error occurred.';
    return NextResponse.json({ error: `Failed to create Razorpay subscription: ${errorMessage}` }, { status: 500 });
  }
}
