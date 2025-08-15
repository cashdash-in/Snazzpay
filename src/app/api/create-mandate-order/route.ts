
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

        // The backend now ONLY creates a simple order for the authorization fee (Rs. 1)
        // The mandate creation logic (the 'token' object) is now handled on the client-side.
        const orderOptions = {
            amount: 100, // Correctly set to 100 paise (₹1) for authorization
            currency: 'INR',
            receipt: `rcpt_cod_${uuidv4().substring(0,8)}`,
            payment_capture: true, // This can be true, as it's just for the Rs. 1 auth
            notes: {
                product: productName,
                original_amount: amount, // Keep track of the original amount
                type: "secure_cod_mandate_auth",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            },
            // The 'token' object is REMOVED from the backend call.
        };

        console.log("Creating Razorpay order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay order:", order);

        // Return the order_id. The frontend will use this to open checkout.
        return NextResponse.json({ order_id: order.id });

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
