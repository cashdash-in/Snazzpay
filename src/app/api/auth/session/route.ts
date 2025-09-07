
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Duration of the session cookie in seconds
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const { idToken, isSeller } = await request.json();

    if (!idToken) {
      return new NextResponse(JSON.stringify({ error: "idToken is required" }), { status: 400 });
    }

    // Set the session cookie
    cookies().set('firebaseAuthToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS,
      path: '/',
    });
     // Set a client-side cookie to indicate role
    cookies().set('userRole', isSeller ? 'seller' : 'admin', {
      maxAge: SEVEN_DAYS,
      path: '/',
    });


    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    // Clear both cookies
    cookies().set('firebaseAuthToken', '', { expires: new Date(0), path: '/' });
    cookies().set('userRole', '', { expires: new Date(0), path: '/' });
    
    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
