
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
    try {
        const { amount, productName } = await request.json();

        // Create an order for ₹1 to authorize the mandate
        const orderOptions = {
            amount: 100, // 100 paise = ₹1
            currency: 'INR',
            receipt: `receipt_cod_${uuidv4()}`,
            payment_capture: true,
            notes: {
                product: productName,
                original_amount: amount,
                type: "secure_cod_mandate"
            },
            token: {
                // This creates the mandate.
                // The customer authorizes future payments up to the max amount.
                "callback_url": "https://example.com/callback", // A dummy URL is often fine here
                "callback_method": "get" as const,
                "max_amount": amount * 100, // The full product price in paise
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        return NextResponse.json({ order_id: order.id, amount: order.amount });

    } catch (error) {
        console.error('Failed to create Razorpay mandate order:', error);
        let errorMessage = 'An internal server error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return new NextResponse(
            JSON.stringify({ error: 'Failed to create Razorpay mandate order: ' + errorMessage }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
