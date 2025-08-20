
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Terms and Conditions</CardTitle>
                    <CardDescription>for Secure COD with Snazzify Trust Wallet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground">
                    <div className="space-y-4">
                        <p>
                           Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the Secure Cash on Delivery (COD) with Trust Wallet service operated by Snazzify ("us", "we", or "our").
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">1. Service Description</h3>
                        <p>
                           The Secure COD service allows customers to confirm their intent to purchase by pre-authorizing the order amount. This amount is held in a secure, personal Snazzify Trust Wallet for the duration of the order. This is not a prepayment.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">2. Authorization Process & Trust Wallet</h3>
                        <p>
                           By accepting these terms, you authorize Snazzify to create an eMandate via Razorpay to hold funds equal to the total amount of your order in your Snazzify Trust Wallet. No funds will be debited from your account at the time of authorization; they are simply held.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">3. Payment on Delivery</h3>
                        <p>
                           You are required to pay the full order amount in cash to the delivery agent upon receiving your order. Successful payment to the delivery agent will complete the transaction.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">4. Release or Capture of Funds from Trust Wallet</h3>
                        <p>
                           <strong>Automatic Release:</strong> The funds held in your Trust Wallet will be automatically released back to your original payment method within 24-48 hours after you have paid the delivery agent in full.
                        </p>
                        <p>
                           <strong>Capture of Funds:</strong> We reserve the right to capture funds from your Trust Wallet under the following circumstances:
                           <ul className="list-disc pl-6 mt-2 space-y-1">
                               <li>You refuse to accept the delivery of the order for any reason other than product damage or incorrect item delivery.</li>
                               <li>You are not available to receive the order after multiple delivery attempts by our courier partner.</li>
                               <li>You cancel the order after it has been shipped from our warehouse. In this case, a shipping and handling fee of Rs. 300 will be captured from the funds held in your Trust Wallet.</li>
                           </ul>
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">5. Customer Responsibility</h3>
                        <p>
                           It is your responsibility to ensure you have sufficient funds in your bank account for the pre-authorization. You are also responsible for being available to receive the delivery and paying the full amount in cash at the time of delivery.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">6. Refund Policy</h3>
                        <p>
                            The funds captured from your Trust Wallet under the conditions outlined in Section 4 serve to cover processing, shipping, and handling fees for failed deliveries and are therefore non-refundable. This does not affect your rights regarding refunds for the product itself as per our standard company refund policy. If you pay for your order via cash on delivery, the authorization in your Trust Wallet is simply released and no refund from it is necessary.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">7. Delivery Policy</h3>
                        <p>
                           We will process and ship your order according to our standard delivery timelines. Our courier partners will make several attempts to deliver your order. If you are unavailable, it may be returned to us, which could result in the capture of funds from your Trust Wallet.
                        </p>

                         <h3 className="font-semibold text-lg text-foreground">8. Limitation of Liability</h3>
                        <p>
                           Snazzify shall not be liable for any issues arising from the eMandate process that are not directly within our control, including but not limited to, actions by Razorpay or your bank. Our liability is limited to the value of the order.
                        </p>

                        <h3 className="font-semibold text-lg text-foreground">9. Changes to Terms</h3>
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
