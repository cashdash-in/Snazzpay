
'use server';

export async function getRazorpayKeyId(): Promise<string | null> {
  return process.env.RAZORPAY_KEY_ID || null;
}
