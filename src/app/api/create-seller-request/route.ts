
import { NextResponse } from 'next/server';
import { saveSellerUser } from '@/services/firestore';
import type { SellerUser } from '@/app/partner-pay/page';

export async function POST(request: Request) {
  try {
    const sellerData: SellerUser = await request.json();

    if (!sellerData || !sellerData.id || !sellerData.email || !sellerData.companyName) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required seller data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // The data is now coming to a trusted server environment.
    // The saveSellerUser function (which uses the Admin SDK implicitly) has the rights to write to Firestore.
    await saveSellerUser(sellerData);

    return new NextResponse(
      JSON.stringify({ success: true, message: 'Seller request created successfully.' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("--- Create Seller Request Error ---");
    if (error.error) {
         console.error(JSON.stringify(error.error, null, 2));
    } else {
        console.error(error);
    }
    const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
    return new NextResponse(
      JSON.stringify({ error: `Failed to create seller request: ${errorMessage}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
