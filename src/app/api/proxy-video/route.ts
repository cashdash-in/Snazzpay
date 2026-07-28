
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return new NextResponse('Missing video URL', { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new NextResponse('Server configuration error: API Key missing', { status: 500 });
  }

  try {
    const response = await fetch(`${videoUrl}&key=${apiKey}`);
    
    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    // Stream the response back to the client
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Video proxy error:', error);
    return new NextResponse('Failed to fetch video', { status: 500 });
  }
}
