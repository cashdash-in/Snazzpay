
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CustomerTermsPage() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                        <div>
                            <CardTitle>Terms and Conditions for Customers</CardTitle>
                            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm max-w-none">
                   <h3>Service Description</h3>
                   <p>Our Secure COD is an upfront payment model. By selecting this option, you agree to pay the full order amount at the time of purchase. These funds are held in a secure, personal Snazzify Trust Wallet until your order is dispatched. This model eliminates the need for cash transactions upon delivery.</p>
                   <h3>Payment and Trust Wallet</h3>
                   <p>By completing the payment, you authorize Snazzify, through its payment partner Razorpay, to debit the full order amount. These funds will be held in your Snazzify Trust Wallet for up to 3 days pending dispatch.</p>
                   <h3>Transfer of Funds</h3>
                   <p>The funds held in your Trust Wallet will be transferred to Snazzify's account only when your order has been dispatched from our warehouse. You will receive a shipping confirmation at that time.</p>
                   <h3>Cancellation and Refund Policy</h3>
                   <p>You may cancel your order under the following conditions:</p>
                   <ul>
                       <li><strong>Before Dispatch:</strong> You can cancel your order at any time before it has been dispatched for a full refund.</li>
                       <li><strong>After Delivery:</strong> You may request a cancellation and return up to 3 days after the product has been delivered.</li>
                       <li><strong>Service Fee:</strong> For all cancellations (both before dispatch and after delivery), a small, non-refundable service fee will be deducted from the refund amount to cover payment processing, shipping, and handling costs. This fee will be clearly communicated.</li>
                   </ul>
                   <p>Refunds will be processed back to your original payment method.</p>
                   <h3>No Payment to Courier</h3>
                   <p>As this is a prepaid service, you are not required to make any payment to the delivery agent. Please refuse any requests for additional payment at the time of delivery.</p>
                </CardContent>
            </Card>
        </div>
    );
}
