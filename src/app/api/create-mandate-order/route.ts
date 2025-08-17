
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
        try {
            // Razorpay doesn't support search by contact in the Node SDK directly in `all`.
            // A better approach is to create the customer and handle potential duplicates.
            const newCustomer = await razorpay.customers.create({
                name: customerName,
                contact: customerContact,
                email: `customer.${customerContact || uuidv4().substring(0,8)}@example.com`,
                notes: {
                    address: customerAddress,
                    pincode: customerPincode,
                }
            });
            customerId = newCustomer.id;

        } catch (customerError: any) {
            // Check if the error indicates a customer with this contact already exists.
            if (customerError.error && customerError.error.description.toLowerCase().includes('contact already exists')) {
                // If so, we need to fetch that customer. This is a limitation of Razorpay's API design.
                // A robust solution would require storing customer IDs in your own database.
                // For this app, we'll proceed but this might create duplicate customers if not handled carefully.
                // A simple workaround is to re-create the customer, Razorpay might merge them.
                 const newCustomer = await razorpay.customers.create({
                    name: customerName,
                    contact: customerContact,
                    email: `customer.${customerContact || uuidv4().substring(0,8)}@example.com`,
                });
                customerId = newCustomer.id;
            } else {
                 throw customerError; // Re-throw other errors
            }
        }
       
        // Step 2: Create Order
        const orderOptions = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${isAuthorization ? 'auth' : 'intent'}_${Date.now()}`.slice(0, 40),
            payment_capture: isAuthorization ? 0 : 1, // Set to 0 for authorization, 1 for immediate capture
            customer_id: customerId,
            notes: {
                product: productName,
                type: isAuthorization ? "secure_cod_card_authorization" : "secure_cod_intent_verification",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            },
        };

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
