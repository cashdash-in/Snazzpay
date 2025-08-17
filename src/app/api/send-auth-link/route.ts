
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { amount, productName, orderId, customerContact } = await request.json();

        if (!amount || !productName || !orderId || !customerContact) {
            return new NextResponse(
                JSON.stringify({ error: "Missing required fields." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://snazzpay.apphosting.page';
        
        // Construct the URL to our own secure-cod page
        const secureCodUrl = new URL(`${appUrl}/secure-cod`);
        secureCodUrl.searchParams.set('amount', amount.toString());
        secureCodUrl.searchParams.set('name', productName);
        secureCodUrl.searchParams.set('order_id', orderId);

        const message = `Please confirm your Secure COD order with Snazzify by clicking this link: ${secureCodUrl.toString()}`;

        // Using Textbelt to send the SMS/WhatsApp message
        // Note: The free tier sends via SMS and may have a "textbelt.com" branding.
        const textbeltResponse = await fetch('https://textbelt.com/text', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: customerContact,
                message: message,
                key: 'textbelt', // Use the free key
            }),
        });

        const textbeltResult = await textbeltResponse.json();

        if (!textbeltResult.success) {
            console.error("Textbelt API Error:", textbeltResult);
            // Even if SMS fails, we can still inform the user
            return new NextResponse(
                JSON.stringify({ 
                    error: `Failed to send SMS: ${textbeltResult.error || 'Unknown error'}. You can still manually send this link: ${secureCodUrl.toString()}` 
                }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Authorization link sent to ${customerContact}.`
        });

    } catch (error: any) {
        console.error("--- Send Auth Link Error ---");
        console.error(error);
        const errorMessage = error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create and send auth link: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
