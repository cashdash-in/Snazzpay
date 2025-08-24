
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
                    <p>As a Snazzify Partner Pay Agent ("Partner"), you act as a trusted intermediary, facilitating cash-to-digital transactions for customers. Your primary role is to collect cash payments and issue Snazzify Coin codes from your available balance.</p>
                    <h3>2. Snazzify Coin Balance</h3>
                    <p>Your Snazzify Coin balance is a digital float that you must maintain. You can top up this balance through approved payment methods. Transactions with customers will debit this balance. Snazzify is not responsible for any losses due to mismanagement of your coin balance or cash.</p>
                    <h3>3. Transaction Integrity</h3>
                    <p>You must ensure that for every cash amount collected, a corresponding and accurate Snazzify Coin transaction is processed. Any discrepancy or fraudulent activity will result in immediate suspension of your account and potential legal action.</p>
                    <h3>4. Commission and Fees</h3>
                    <p>You will earn a pre-determined commission on each successful transaction facilitated. This commission is your sole compensation for this service. Snazzify reserves the right to change commission structures with prior notice.</p>
                    <h3>5. Compliance</h3>
                    <p>You agree to comply with all local laws and regulations regarding financial transactions. You are responsible for maintaining proper records (e.g., in a "bahi khata" or ledger) for all cash collected.</p>
                </CardContent>
            </Card>
        </div>
    );
}
