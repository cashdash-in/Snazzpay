
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    // --- Start Debugging ---
    console.log("--- create-mandate-order API route called ---");
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.error("Razorpay API keys are not set in environment variables.");
        return new NextResponse(
            JSON.stringify({ error: "Server configuration error: Razorpay keys are missing." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
    console.log("Successfully read Razorpay Key ID from environment.");
    // --- End Debugging ---

    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    try {
        const { amount, productName } = await request.json();
        console.log(`Received request to create mandate for product: ${productName}, amount: ${amount}`);

        // Step 1: Create a Customer
        console.log("Creating Razorpay customer...");
        const customer = await razorpay.customers.create({
            name: 'Secure COD Customer',
            email: `customer_${uuidv4().substring(0,8)}@example.com`,
            contact: '9999999999', // Placeholder contact
        });
        console.log("Successfully created Razorpay customer:", customer);


        // Step 2: Create the Order with the customer_id
        const orderOptions = {
            amount: 100, // 100 paise = ₹1 for authorization
            currency: 'INR',
            receipt: `rcpt_cod_${uuidv4().substring(0,8)}`,
            payment_capture: true,
            customer_id: customer.id, // Pass the newly created customer ID
            notes: {
                product: productName,
                original_amount: amount,
                type: "secure_cod_mandate"
            },
            // This token object is crucial for creating an eMandate
            token: {
                "callback_url": "https://example.com/callback", // A dummy URL is fine
                "callback_method": "get" as const,
                "max_amount": amount * 100, // The full product price in paise
            }
        };

        console.log("Creating Razorpay order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay order:", order);

        return NextResponse.json({ order_id: order.id, amount: order.amount, customer_id: customer.id });

    } catch (error: any) {
        // --- Enhanced Error Logging ---
        console.error("--- Razorpay API Error ---");
        console.error("Failed to create Razorpay mandate order. Full error object:");
        console.error(JSON.stringify(error, null, 2));
        // --- End Enhanced Error Logging ---

        // Send a more detailed error back to the client
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create Razorpay mandate order: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
