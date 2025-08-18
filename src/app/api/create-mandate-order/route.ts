
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.error("Razorpay API keys are not set in environment variables.");
        return new NextResponse(
            JSON.stringify({ error: "Server configuration error: Razorpay keys are missing." }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    try {
        const { amount, productName, customerName, customerContact, customerAddress, customerPincode, isAuthorization } = await request.json();
        
        let customerId;

        // Step 1: Find or Create Customer
        // This is the simplest approach. A more robust solution for a production app would be to
        // first search for the customer by contact number if your Razorpay plan supports it,
        // or to store Razorpay customer IDs in your own database.
        // For this app's purpose, creating a customer is sufficient, and Razorpay may handle de-duplication.
        try {
            const newCustomer = await razorpay.customers.create({
                name: customerName,
                contact: customerContact,
                // Using a unique email helps prevent conflicts if the same email is used with different contact numbers.
                email: `customer.${customerContact || uuidv4().substring(0,8)}@example.com`,
                notes: {
                    address: customerAddress,
                    pincode: customerPincode,
                }
            });
            customerId = newCustomer.id;

        } catch (customerError: any) {
            // The most common error is the customer contact already existing.
            // In a real production environment, you would fetch the existing customer's ID.
            // Since this app does not have its own database to store customer mappings,
            // we will log the error and proceed. This can be improved in a full-scale app.
            console.warn(`Could not create new Razorpay customer (they might already exist): ${customerError.error?.description || customerError.message}`);
             // We can proceed without a customerId for the order, Razorpay will handle it.
        }
       
        // Step 2: Create Order
        const orderOptions: any = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${isAuthorization ? 'auth' : 'intent'}_${Date.now()}`.slice(0, 40),
            payment_capture: 0, // Always set to 0 for authorization, for both intent and final amount.
            notes: {
                product: productName,
                type: isAuthorization ? "secure_cod_card_authorization" : "secure_cod_intent_verification",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            },
        };
        
        if (customerId) {
            orderOptions.customer_id = customerId;
        }

        console.log("Creating Razorpay order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay order:", order);

        return NextResponse.json({ order_id: order.id });

    } catch (error: any) {
        console.error("--- Razorpay API Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: `Failed to create Razorpay order: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
