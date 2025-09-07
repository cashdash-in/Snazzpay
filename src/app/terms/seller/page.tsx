'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SellerTermsPage() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                        <div>
                            <CardTitle>Master Service Agreement for Sellers</CardTitle>
                            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm max-w-none">
                    <h3>1. Services Provided</h3>
                    <p>Snazzify ("Platform") agrees to provide the Seller ("You") with access to its Secure Cash on Delivery (COD) payment processing system, order management dashboard, and associated logistics network coordination. The service is designed to reduce returns (RTO) and eliminate COD fraud by securing payment prior to dispatch.</p>
                    
                    <h3>2. Order Processing & Fulfillment</h3>
                    <p>You are responsible for accurately listing your products and providing complete order details for any COD orders you wish to process through the Platform. Upon a customer's successful payment authorization via Snazzify's Secure COD, you will be notified to prepare the order for dispatch. You agree to dispatch the order within the timeframe communicated to the customer.</p>
                    
                    <h3>3. Shakti COD Card Program</h3>
                    <p>You agree to participate in the Shakti COD Card loyalty program. This program is operated by Snazzify and its Partner Pay agents to incentivize customer loyalty. By using the Platform, you acknowledge and agree that the value of any loyalty points or discounts redeemed by a customer using their Shakti Card for a transaction involving your product will be deducted from the final settlement amount you receive for that transaction. The Platform will provide a clear reconciliation of these deductions in your earnings report.</p>

                    <h3>4. Payment & Payouts</h3>
                    <p>Funds from a successfully authorized Secure COD order will be captured and transferred to your designated account only after the order has been marked as "Delivered" by the logistics partner. Payouts will be subject to a pre-agreed transaction fee (the "Platform Fee"). The final payout amount will be the total order value minus the Platform Fee and any deductions from the Shakti COD Card program.</p>

                    <h3>5. Liability</h3>
                    <p>Snazzify's liability is limited to the secure processing of the payment and coordination with logistics partners. You, the Seller, retain full liability for the product's quality, accuracy, and condition until it is handed over to the assigned logistics partner. You are also responsible for handling any product-related customer disputes or warranty claims.</p>
                    
                     <h3>6. Data and Confidentiality</h3>
                    <p>You agree to handle all customer data provided through the Platform with the utmost confidentiality and in compliance with applicable data protection laws. This data is to be used solely for the purpose of fulfilling the customer's order.</p>
                </CardContent>
            </Card>
        </div>
    );
}
