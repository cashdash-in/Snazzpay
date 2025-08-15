
'use server';

export async function getRazorpayKeyId(): Promise<string | null> {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
}
