
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
        const { amount, productName, name, email, contact, address, pincode, isAuthorization } = await request.json();
        
        // Generate a new, unique order ID on the server for every request.
        const uniqueOrderId = \`SNZ-\${Math.floor(1000 + Math.random() * 9000)}-\${uuidv4().substring(0, 4).toUpperCase()}\`;

        let customerId;

        // Step 1: Find or Create Customer
        try {
            const newCustomer = await razorpay.customers.create({
                name: name,
                contact: contact,
                email: email || \`customer.\${contact || uuidv4().substring(0,8)}@example.com\`,
                notes: {
                    address: address,
                    pincode: pincode,
                }
            });
            customerId = newCustomer.id;

        } catch (customerError: any) {
            console.warn(\`Could not create new Razorpay customer (they might already exist): \${customerError.error?.description || customerError.message}\`);
        }
       
        // Step 2: Create Order
        const orderOptions: any = {
            amount: Math.round(amount * 100), // Amount in paise
            currency: 'INR',
            receipt: uniqueOrderId, // Use the unique ID as the receipt
            payment_capture: isAuthorization ? 0 : 1,
            notes: {
                product: productName,
                type: isAuthorization ? "secure_cod_card_authorization" : "secure_cod_intent_verification",
                customerName: name,
                customerContact: contact,
                customerAddress: address,
                customerPincode: pincode,
                internalOrderId: uniqueOrderId, // Store our unique ID in notes
            }
        };

        if (customerId) {
            orderOptions.customer_id = customerId;
        }

        console.log("Creating Razorpay order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay order:", order);
        
        // Return BOTH the Razorpay order ID and our new unique internal order ID
        return NextResponse.json({ order_id: order.id, internal_order_id: uniqueOrderId });

    } catch (error: any) {
        console.error("--- Razorpay API Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: \`Failed to create Razorpay order: \${errorMessage}\` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
