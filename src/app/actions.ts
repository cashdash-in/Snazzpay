
'use server';

export async function getRazorpayKeyId(): Promise<string | null> {
  // This action securely provides the key to the client component.
  return process.env.RAZORPAY_KEY_ID || null;
}
