
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PartnerPayTermsPage() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                        <div>
                            <CardTitle>Terms and Conditions for Partner Pay Agents</CardTitle>
                            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm max-w-none">
                    <h3>1. Role and Responsibility</h3>
                    <p>As a Snazzify Partner Pay Agent ("Partner"), you act as a trusted intermediary, facilitating cash-to-digital transactions for customers. Your primary role is to collect cash payments from customers and issue corresponding "Snazzify Coin" codes from your available digital balance. You may also serve as a local logistics hub for parcel pickups.</p>
                    
                    <h3>2. Snazzify Coin Balance</h3>
                    <p>Your Snazzify Coin balance is a digital float that you must maintain. You can top up this balance through approved payment methods, which may involve settlement with a logistics agent. Transactions with customers will debit this balance. Snazzify is not responsible for any losses due to mismanagement of your coin balance or cash. You are solely responsible for safeguarding your cash collections.</p>
                    
                    <h3>3. Shakti Card Transactions & Liability</h3>
                    <p>You are a key part of the Shakti COD Card loyalty program. Your responsibilities include:</p>
                    <ul>
                        <li><strong>Verification:</strong> Using your dashboard to verify a customer's Shakti Card number.</li>
                        <li><strong>Applying Discounts:</strong> Correctly applying any available discounts to the transaction total as displayed on your dashboard.</li>
                        <li><strong>Liability:</strong> You are liable for accurately processing the transaction, including applying the correct discount. Failure to do so may result in financial discrepancy for which you will be held responsible. The discount amount reduces the cash you collect and the coin value you settle with the seller.</li>
                    </ul>

                    <h3>4. Transaction Integrity & Commission</h3>
                    <p>You must ensure that for every cash amount collected, a corresponding and accurate Snazzify Coin transaction is processed. You will earn a pre-determined commission on each successful transaction. This commission is your sole compensation for this service. Any fraudulent activity will result in immediate suspension of your account and potential legal action.</p>
                    
                    <h3>5. Logistics Hub Services</h3>
                    <p>If you opt-in to act as a logistics hub, you agree to securely store parcels for customer pickup and manage the handover process as defined in the dashboard. You may be compensated separately for these services.</p>
                </CardContent>
            </Card>
        </div>
    );
}
