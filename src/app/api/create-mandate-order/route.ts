
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
        const { amount, productName, customerName, customerEmail, customerContact, customerAddress, customerPincode, isAuthorization } = await request.json();
        
        let customerId;

        // Step 1: Find or Create Customer
        try {
            const newCustomer = await razorpay.customers.create({
                name: customerName,
                contact: customerContact,
                email: customerEmail || `customer.${customerContact || uuidv4().substring(0,8)}@example.com`,
                notes: {
                    address: customerAddress,
                    pincode: customerPincode,
                }
            });
            customerId = newCustomer.id;

        } catch (customerError: any) {
            console.warn(`Could not create new Razorpay customer (they might already exist): ${customerError.error?.description || customerError.message}`);
        }
       
        // Step 2: Create Order
        const orderOptions: any = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: `rcpt_${isAuthorization ? 'auth' : 'intent'}_${Date.now()}`.slice(0, 40),
            payment_capture: 0, // Always set to 0 for authorization
            notes: {
                product: productName,
                type: isAuthorization ? "secure_cod_card_authorization" : "secure_cod_intent_verification",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            }
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
