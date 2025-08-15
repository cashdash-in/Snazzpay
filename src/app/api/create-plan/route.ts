
import { NextRequest, NextResponse } from 'next/server';
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

// This route is for one-time use to create the plan in your Razorpay account.
// Once created, you should not need to call this again.
export async function GET(req: NextRequest) {
  try {
    const planOptions = {
      period: 'yearly' as const,
      interval: 1,
      item: {
        name: 'SnazzPay On-Demand Mandate Plan',
        amount: 0, // Plan amount is 0 for on-demand authorization
        currency: 'INR',
        description: 'Plan for authorizing future on-demand payments.',
      },
       notes: {
        plan_id: 'plan_EMandateSnazzPay' // Custom ID for easy reference
      }
    };

    const plan = await razorpay.plans.create(planOptions);

    if (!plan) {
      return NextResponse.json({ error: 'Failed to create Razorpay plan.' }, { status: 500 });
    }

    // IMPORTANT: The ID you need for the subscription is plan.id, NOT the notes.plan_id.
    // However, Razorpay doesn't allow setting a custom plan_id that can be used in the API call.
    // The official plan ID will look like 'plan_xxxxxxxxx'.
    // For this app, we will use a hardcoded plan ID created manually for simplicity and robustness.
    return NextResponse.json({ 
        message: "Plan created successfully! Please check your Razorpay Dashboard.",
        plan_details: plan 
    });

  } catch (error: any) {
    console.error('Razorpay API Error:', error);
    const errorMessage = error.description || error.message || 'An internal server error occurred.';
    return NextResponse.json({ error: `Failed to create Razorpay plan: ${errorMessage}` }, { status: 500 });
  }
}
