
'use server';

import Razorpay from 'razorpay';
import { z } from 'zod';

const CreateSubscriptionInputSchema = z.object({
  plan_id: z.string(),
  total_count: z.number().int(),
  quantity: z.number().int(),
  customer_notify: z.number().int().min(0).max(1),
  notes: z.record(z.string()).optional(),
});

type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionInputSchema>;

export async function createRazorpaySubscription(
  options: CreateSubscriptionInput
): Promise<{ subscription_id?: string; error?: string }> {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    return { error: 'Razorpay API keys are not configured on the server.' };
  }

  try {
    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const subscription = await razorpay.subscriptions.create(options);

    if (!subscription || !subscription.id) {
      return { error: 'Failed to create Razorpay subscription.' };
    }

    return { subscription_id: subscription.id };
  } catch (error: any) {
    console.error('Razorpay Subscription Creation Error:', error);
    const errorMessage =
      error.error?.description || error.message || 'An internal server error occurred.';
    return { error: `Failed to create Razorpay subscription: ${errorMessage}` };
  }
}


export async function getRazorpayKeyId(): Promise<string | null> {
  return process.env.RAZORPAY_KEY_ID || null;
}
