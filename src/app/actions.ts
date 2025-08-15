'use server';

import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error('Razorpay API keys are not configured on the server.');
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function createSubscription() {
  try {
    const planId = 'plan_EMandateSnazzPay'; // Use the pre-created plan

    const subscriptionOptions = {
      plan_id: planId,
      total_count: 120, // Authorize for 10 years (12 * 10 on a yearly plan)
      quantity: 1,
      customer_notify: 0,
      notes: {
        order_purpose: 'On-demand payment authorization for COD',
      },
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    if (!subscription) {
      return { error: 'Failed to create Razorpay subscription object.' };
    }

    return { subscription_id: subscription.id };

  } catch (error: any) {
    console.error('Razorpay API Error creating subscription:', error);
    const errorMessage = error.error?.description || error.message || 'An internal server error occurred creating the subscription.';
    return { error: errorMessage };
  }
}
