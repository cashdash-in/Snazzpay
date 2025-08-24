
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TermsAndConditionsPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Terms and Conditions</CardTitle>
                    <CardDescription>Please review the terms applicable to your role.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground">
                    <Tabs defaultValue="customer">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="customer">For Customers</TabsTrigger>
                            <TabsTrigger value="partner_pay">For Partner Pay Agents</TabsTrigger>
                            <TabsTrigger value="logistics">For Logistics Partners</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="customer" className="mt-4 prose prose-sm max-w-none">
                           <h3>Service Description</h3>
                           <p>Our Secure COD is an upfront payment model. By selecting this option, you agree to pay the full order amount at the time of purchase. These funds are held in a secure, personal Snazzify Trust Wallet until your order is dispatched. This model eliminates the need for cash transactions upon delivery.</p>
                           <h3>Payment and Trust Wallet</h3>
                           <p>By completing the payment, you authorize Snazzify, through its payment partner Razorpay, to debit the full order amount. These funds will be held in your Snazzify Trust Wallet for up to 3 days pending dispatch.</p>
                           <h3>Transfer of Funds</h3>
                           <p>The funds held in your Trust Wallet will be transferred to Snazzify's account once your order has been dispatched from our warehouse. You will receive a shipping confirmation at that time.</p>
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
                        </TabsContent>

                        <TabsContent value="partner_pay" className="mt-4 prose prose-sm max-w-none">
                            <h3>1. Role and Responsibility</h3>
                            <p>As a Snazzify Partner Pay Agent ("Partner"), you act as a trusted intermediary, facilitating cash-to-digital transactions for customers. Your primary role is to collect cash payments and issue Snazzify Coin codes from your available balance.</p>
                            <h3>2. Snazzify Coin Balance</h3>
                            <p>Your Snazzify Coin balance is a digital float that you must maintain. You can top up this balance through approved payment methods. Transactions with customers will debit this balance. Snazzify is not responsible for any losses due to mismanagement of your coin balance or cash.</p>
                            <h3>3. Transaction Integrity</h3>
                            <p>You must ensure that for every cash amount collected, a corresponding and accurate Snazzify Coin transaction is processed. Any discrepancy or fraudulent activity will result in immediate suspension of your account and potential legal action.</p>
                            <h3>4. Commission and Fees</h3>
                            <p>You will earn a pre-determined commission on each successful transaction facilitated. This commission is your sole compensation for this service. Snazzify reserves the right to change commission structures with prior notice.</p>
                            <h3>5. Compliance</h3>
                            <p>You agree to comply with all local laws and regulations regarding financial transactions. You are responsible for maintaining proper records (e.g., in a "bahi khata" or ledger) for all cash collected.</p>
                        </TabsContent>

                        <TabsContent value="logistics" className="mt-4 prose prose-sm max-w-none">
                            <h3>1. Service Agreement</h3>
                            <p>As a Logistics Partner, you agree to provide secure, timely, and professional delivery and pickup services for Snazzify orders. This includes managing your fleet of agents and any service partners you subcontract.</p>
                             <h3>2. Fleet Management</h3>
                            <p>You are solely responsible for the hiring, training, and conduct of your delivery agents. You must ensure all agents comply with Snazzify's standards of service and customer interaction. You are liable for the actions of your agents.</p>
                             <h3>3. Cash Handling &amp; Settlement</h3>
                            <p>Your agents may be required to collect cash from customers or settle cash balances with Partner Pay agents. You are responsible for the secure collection and timely settlement of all cash with Snazzify. Discrepancies may lead to penalties or account suspension.</p>
                             <h3>4. Liability and Insurance</h3>
                            <p>You must maintain adequate insurance for goods in transit. You are liable for any loss or damage to a shipment from the point of pickup until it is successfully delivered to the customer or returned to Snazzify.</p>
                            <h3>5. Confidentiality</h3>
                            <p>You and your agents must maintain the confidentiality of all customer data, including names, addresses, and contact information. Unauthorized use or sharing of this data is strictly prohibited and will result in termination of the partnership.</p>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
