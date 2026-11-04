
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Priority: Server-side environment variables then Publicly exposed ones
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    
    if (!keyId) {
      console.warn("[Razorpay Warning]: RAZORPAY_KEY_ID is missing from server environment variables.");
      return NextResponse.json({ 
        keyId: null,
        error: "Gateway configuration missing",
        diagnostics: "Ensure RAZORPAY_KEY_ID is set in your Netlify/Vercel dashboard and trigger a new deploy."
      }, { status: 200 }); 
    }
    
    return NextResponse.json({ keyId });
  } catch (error: any) {
    console.error("Error fetching Razorpay Key ID:", error);
    return NextResponse.json({ keyId: null, error: "Internal server error" }, { status: 500 });
  }
}
