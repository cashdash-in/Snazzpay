
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
            const existingCustomers = await razorpay.customers.all({ contact: customerContact });

            if (existingCustomers && existingCustomers.items && existingCustomers.items.length > 0) {
                customerId = existingCustomers.items[0].id;
            } else {
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
            }
        } catch (customerError: any) {
            if (customerError.error && customerError.error.description.includes('already exists')) {
                 return new NextResponse(
                    JSON.stringify({ error: "A customer with this contact number already exists. Please try again." }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } }
                );
            }
            throw customerError;
        }
       
        // Step 2: Create Order
        const orderOptions = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${isAuthorization ? 'auth' : 'intent'}_${uuidv4().substring(0,8)}`,
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
