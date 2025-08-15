
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
        const { amount, productName, customerName, customerContact, customerAddress, customerPincode } = await request.json();
        
        let customerId;

        // Step 1: Find or Create Customer
        try {
            // Search for customer by contact number. This part of the SDK is not officially documented but works.
            // A more robust solution might involve storing a mapping in your own database.
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
             // Handle case where customer might already exist if search fails for some reason
            if (customerError.error && customerError.error.description.includes('already exists')) {
                 return new NextResponse(
                    JSON.stringify({ error: "A customer with this contact number already exists. Please try again." }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } }
                );
            }
            throw customerError; // Re-throw other customer errors
        }
       
        // Step 2: Create Order with Mandate Token and Customer ID
        const orderOptions = {
            amount: 100, // Mandate authorization fee is ₹1
            currency: 'INR',
            receipt: `rcpt_cod_${uuidv4().substring(0,8)}`,
            payment_capture: false, // Must be false for mandates
            customer_id: customerId, // Associate the customer
            token: {
                "max_amount": amount * 100, // The full product price in paise
                "expire_at": Math.floor(Date.now() / 1000) + (36 * 30 * 24 * 60 * 60) // Expires in 36 months
            },
            notes: {
                product: productName,
                original_amount: amount,
                type: "secure_cod_mandate_auth",
                customerName,
                customerContact,
                customerAddress,
                customerPincode
            },
        };

        console.log("Creating Razorpay mandate order with options:", JSON.stringify(orderOptions, null, 2));
        const order = await razorpay.orders.create(orderOptions);
        console.log("Successfully created Razorpay mandate order:", order);

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
            JSON.stringify({ error: `Failed to create Razorpay mandate order: ${errorMessage}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
