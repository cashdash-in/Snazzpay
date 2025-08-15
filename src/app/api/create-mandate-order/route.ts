
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
        const { amount, productName, customerName, customerContact, customerAddress, customerPincode } = await request.json();
        console.log(`Received request to create mandate for product: ${productName}, amount: ${amount}`);

        // Step 1 (REMOVED): No longer creating customer on the backend.
        // This will be handled by Razorpay checkout based on prefill data.

        // Step 2: Create the Order
        const orderOptions = {
            amount: 100, // Correctly set to 100 paise (₹1) for authorization
            currency: 'INR',
            receipt: `rcpt_cod_${uuidv4().substring(0,8)}`,
            payment_capture: false,
            // customer_id is no longer passed here
            notes: {
                product: productName,
                original_amount: amount,
                type: "secure_cod_mandate",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            },
            // This token object is crucial for creating an eMandate
            token: {
                "max_amount": amount * 100, // The full product price in paise for the mandate
            }
        };

        console.log("Creating Razorpay order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay order:", order);

        // We don't have a customer_id to return anymore, which is fine.
        return NextResponse.json({ order_id: order.id, amount: order.amount });

    } catch (error: any) {
        // --- Enhanced Error Logging ---
        console.error("--- Razorpay API Error ---");
        console.error("Failed to create Razorpay mandate order. Full error object:");
        // Check for Razorpay's specific error structure
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        // --- End Enhanced Error Logging ---

        // Send a more detailed error back to the client
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create Razorpay mandate order: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
