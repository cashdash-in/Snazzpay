
import { NextResponse } from 'next/server';
import { URLSearchParams } from 'url';

export async function POST(request: Request) {
    try {
        const { amount, productName, orderId } = await request.json();

        if (!amount || !productName || !orderId) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields: amount, productName, orderId" }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://snazzpay.apphosting.page';
        const secureCodUrl = `${appUrl}/secure-cod`;

        const params = new URLSearchParams({
            amount: amount.toString(),
            name: productName,
            order_id: orderId,
        });

        const finalUrl = `${secureCodUrl}?${params.toString()}`;

        return NextResponse.json({
            success: true,
            message: "Secure COD URL generated. Please send it to the customer manually.",
            paymentLink: finalUrl
        });

    } catch (error: any) {
        console.error("--- URL Generation Error ---");
        console.error(error);
        const errorMessage = error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to generate Secure COD URL: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
