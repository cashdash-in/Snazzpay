
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Terms and Conditions</CardTitle>
                    <CardDescription>for Secure COD by Snazzify</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground">
                    <div className="space-y-4">
                        <p>
                           Please read these Terms and Conditions ("Terms") carefully before using the Secure COD payment service operated by Snazzify ("us", "we", or "our"). This service represents a modern, secure method for completing your purchase.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">1. Service Description</h3>
                        <p>
                           Our Secure COD is an upfront payment model. By selecting this option, you agree to pay the full order amount at the time of purchase. These funds are held in a secure, personal Snazzify Trust Wallet until your order is dispatched. This model eliminates the need for cash transactions upon delivery.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">2. Payment and Trust Wallet</h3>
                        <p>
                           By completing the payment, you authorize Snazzify, through its payment partner Razorpay, to debit the full order amount. These funds will be held in your Snazzify Trust Wallet for up to 3 days pending dispatch.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">3. Transfer of Funds</h3>
                        <p>
                           The funds held in your Trust Wallet will be transferred to Snazzify's account once your order has been dispatched from our warehouse. You will receive a shipping confirmation at that time.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">4. Cancellation and Refund Policy</h3>
                        <p>
                           You may cancel your order under the following conditions:
                           <ul className="list-disc pl-6 mt-2 space-y-1">
                               <li><strong>Before Dispatch:</strong> You can cancel your order at any time before it has been dispatched for a full refund.</li>
                               <li><strong>After Delivery:</strong> You may request a cancellation and return up to 3 days after the product has been delivered.</li>
                               <li><strong>Service Fee:</strong> For all cancellations (both before dispatch and after delivery), a small, non-refundable service fee will be deducted from the refund amount to cover payment processing, shipping, and handling costs. This fee will be clearly communicated.</li>
                           </ul>
                           Refunds will be processed back to your original payment method.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">5. No Payment to Courier</h3>
                        <p>
                           As this is a prepaid service, you are not required to make any payment to the delivery agent. Please refuse any requests for additional payment at the time of delivery.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">6. Fraud Reduction</h3>
                        <p>
                           This payment model is one of its kind and is designed to ensure genuine transactions, which helps us reduce fraud and maintain competitive pricing for our customers.
                        </p>

                         <h3 className="font-semibold text-lg text-foreground">7. Limitation of Liability</h3>
                        <p>
                           Snazzify's liability is limited to the value of the order. We are not responsible for issues arising from the actions of payment gateways or your bank that are outside our direct control.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">8. Changes to Terms</h3>
                        <p>
                           We reserve the right to modify these terms and conditions at any time. We will notify you of any changes by posting the new terms on this page.
                        </p>

                         <p className="pt-4 text-center text-xs">
                           By using the Secure COD service, you signify your acceptance of these Terms and Conditions.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
