
import { NextResponse } from 'next/server';
import { getCollection } from '@/services/firestore';

export async function GET() {
    try {
        const discounts = await getCollection('discounts');
        return NextResponse.json(discounts);
    } catch (error) {
        console.error('Failed to fetch discounts:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Could not fetch discount data.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
