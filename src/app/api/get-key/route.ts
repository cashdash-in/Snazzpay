
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    
    if (!keyId) {
      console.warn("[Razorpay Warning]: NEXT_PUBLIC_RAZORPAY_KEY_ID is missing from environment variables.");
      return new NextResponse(
        JSON.stringify({ 
            error: "Payment gateway key not found on server.",
            diagnostics: "Ensure NEXT_PUBLIC_RAZORPAY_KEY_ID is set in your Netlify/Vercel dashboard."
        }), 
        { status: 500 }
      );
    }
    
    return NextResponse.json({ keyId });
  } catch (error: any) {
    console.error("Error fetching Razorpay Key ID:", error);
    return new NextResponse(JSON.stringify({ error: "An internal server error occurred." }), { status: 500 });
  }
}
