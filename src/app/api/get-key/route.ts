
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      // This error will be logged on the server, not exposed to the client.
      console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set in environment variables.");
      return new NextResponse(JSON.stringify({ error: "Payment gateway is not configured on the server." }), { status: 500 });
    }
    return NextResponse.json({ keyId });
  } catch (error: any) {
    console.error("Error fetching Razorpay Key ID:", error);
    return new NextResponse(JSON.stringify({ error: "An internal server error occurred." }), { status: 500 });
  }
}
