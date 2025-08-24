
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogisticsTermsPage() {
    const router = useRouter();
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
                        <div>
                            <CardTitle>Terms and Conditions for Logistics Partners</CardTitle>
                            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 text-sm text-muted-foreground prose prose-sm max-w-none">
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
                </CardContent>
            </Card>
        </div>
    );
}
