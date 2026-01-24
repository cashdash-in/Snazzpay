
import { NextResponse } from 'next/server';
// import { getCollection } from '@/services/firestore'; // This is now a client module

export async function GET() {
    try {
        // This functionality needs to be reimplemented in a way that doesn't
        // use the client-side SDK on the server. Returning an empty array to fix build.
        const discounts: any[] = [];
        return NextResponse.json(discounts);
    } catch (error) {
        console.error('Failed to fetch discounts:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Could not fetch discount data.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
