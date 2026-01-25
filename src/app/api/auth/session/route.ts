
import { NextResponse } from 'next/server';

// Duration of the session cookie in seconds
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    const { idToken, role } = await request.json();

    if (!idToken || !role) {
      return new NextResponse(JSON.stringify({ error: "idToken and role are required" }), { status: 400 });
    }
    
    const response = new NextResponse(JSON.stringify({ success: true }), { status: 200 });
    // Set the session cookie
    response.cookies.set('firebaseAuthToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS,
      path: '/',
    });
     // Set a client-side cookie to indicate role
    response.cookies.set('userRole', role, {
      maxAge: SEVEN_DAYS,
      path: '/',
    });


    return response;
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}


export async function DELETE(request: Request) {
  try {
    const response = new NextResponse(JSON.stringify({ success: true }), { status: 200 });
    // Clear both cookies
    response.cookies.set('firebaseAuthToken', '', { expires: new Date(0), path: '/' });
    response.cookies.set('userRole', '', { expires: new Date(0), path: '/' });
    
    return response;
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
