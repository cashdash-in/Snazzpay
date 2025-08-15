
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Terms and Conditions</CardTitle>
                    <CardDescription>for Secure Cash on Delivery (COD)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground">
                    <div className="space-y-4">
                        <p>
                           Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the Secure Cash on Delivery (COD) service operated by Snazzify ("us", "we", or "our").
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">1. Service Description</h3>
                        <p>
                           The Secure COD service allows customers to confirm their intent to purchase by pre-authorizing the order amount via Razorpay eMandate. This is not a prepayment. It is a temporary hold on your card or bank account that is only captured under specific conditions.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">2. Authorization Process</h3>
                        <p>
                           By accepting these terms and proceeding with Secure COD, you authorize Snazzify to create an eMandate via Razorpay for the total amount of your order. This will place a temporary hold on the funds in your selected payment method. No funds will be debited from your account at the time of authorization.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">3. Payment on Delivery</h3>
                        <p>
                           You are required to pay the full order amount in cash to the delivery agent upon receiving your order. Successful payment to the delivery agent will complete the transaction.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">4. Release or Capture of Authorized Amount</h3>
                        <p>
                           <strong>Automatic Release:</strong> The pre-authorized hold on your account will be automatically released within 24-48 hours after you have paid the delivery agent in full.
                        </p>
                        <p>
                           <strong>Capture of Funds:</strong> We reserve the right to capture the pre-authorized amount under the following circumstances:
                           <ul className="list-disc pl-6 mt-2 space-y-1">
                               <li>You refuse to accept the delivery of the order for any reason other than product damage or incorrect item delivery.</li>
                               <li>You are not available to receive the order after multiple delivery attempts by our courier partner.</li>
                               <li>You cancel the order after it has been shipped from our warehouse.</li>
                           </ul>
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">5. Customer Responsibility</h3>
                        <p>
                           It is your responsibility to ensure you have sufficient funds in your account for the pre-authorization. You are also responsible for being available to receive the delivery and paying the full amount in cash at the time of delivery.
                        </p>
                         <h3 className="font-semibold text-lg text-foreground">6. Limitation of Liability</h3>
                        <p>
                           Snazzify shall not be liable for any issues arising from the eMandate process that are not directly within our control, including but not limited to, actions by Razorpay or your bank. Our liability is limited to the value of the order.
                        </p>
                        <h3 className="font-semibold text-lg text-foreground">7. Changes to Terms</h3>
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

