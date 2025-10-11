
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: Request) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
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
        const { paymentId, totalAmount, feeAmount, reason } = await request.json();

        if (!paymentId || !totalAmount || feeAmount === undefined) {
            return new NextResponse(
                JSON.stringify({ error: "Payment ID, total amount, and fee amount are required." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const totalInPaise = Math.round(parseFloat(totalAmount) * 100);
        const feeInPaise = Math.round(parseFloat(feeAmount) * 100);

        if (feeInPaise >= totalInPaise) {
             return new NextResponse(
                JSON.stringify({ error: "Cancellation fee cannot be greater than or equal to the total order amount." }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }
        
        // Step 1: Capture the fee amount
        const capturedPayment = await razorpay.payments.capture(paymentId, feeInPaise, 'INR');
        console.log("Successfully captured cancellation fee:", capturedPayment);
        
        // Step 2: Refund the remaining amount
        const refundAmount = totalInPaise - feeInPaise;
        if (refundAmount > 0) {
            const refund = await razorpay.payments.refund(paymentId, {
                amount: refundAmount,
                speed: 'normal',
                notes: {
                    reason: reason || "Partial refund after cancellation fee."
                },
                receipt: \`refund-partial-\${paymentId}\`
            });
            console.log("Successfully processed partial refund:", refund);
            return NextResponse.json({ 
                success: true, 
                message: \`Successfully charged a fee of ₹\${feeAmount} and refunded ₹\${(refundAmount / 100).toFixed(2)}.\`,
                captureId: capturedPayment.id,
                refundId: refund.id 
            });
        } else {
             return NextResponse.json({ 
                success: true, 
                message: \`Successfully charged a fee of ₹\${feeAmount}. No refund was necessary.\`,
                captureId: capturedPayment.id
            });
        }

    } catch (error: any) {
        console.error("--- Razorpay Cancellation Fee Error ---");
        if (error.error) {
             console.error(JSON.stringify(error.error, null, 2));
        } else {
            console.error(error);
        }
        const errorMessage = error?.error?.description || error.message || 'An unknown error occurred.';
        return new NextResponse(
            JSON.stringify({ error: \`Failed to process cancellation fee: \${errorMessage}\` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
