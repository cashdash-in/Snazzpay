
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
    
    // Use a single, pre-created plan for all on-demand subscriptions.
    // This plan should be created once in your Razorpay dashboard or via the create-plan API.
    const planId = 'plan_EMandateSnazzPay';

    const subscriptionOptions = {
      plan_id: planId,
      total_count: 120, // Authorize for 10 years (12 * 10)
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
    const errorMessage = error.description || error.message || 'An internal server error occurred.';
    return NextResponse.json({ error: `Failed to create Razorpay subscription: ${errorMessage}` }, { status: 500 });
  }
}
