
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
                    <p>As a Logistics Partner ("You", "Your"), you agree to provide secure, timely, and professional delivery and pickup services for Snazzify orders. This includes managing your fleet of agents and any service partners you subcontract. You are an independent contractor, not an employee of Snazzify.</p>
                    
                     <h3>2. Fleet Management & Agent Conduct</h3>
                    <p>You are solely responsible for the hiring, training, and conduct of your delivery agents. You must ensure all agents comply with Snazzify's standards of service and customer interaction. This includes the critical understanding that end-customer payments are pre-paid through the Secure COD system and agents should not attempt to collect any payment from the end customer under any circumstances.</p>
                     
                     <h3>3. Cash Handling & Settlement with Partners</h3>
                    <p>Your agents may be required to settle cash balances with our registered Partner Pay agents by collecting physical cash and providing it for settlement at your hub. You are responsible for the secure collection, management, and reconciliation of this cash until it is deposited as per our agreed process. You are fully liable for any cash shortages or discrepancies identified during reconciliation with Partner Pay agents or during audits.</p>
                     
                     <h3>4. Liability and Insurance</h3>
                    <p>You must maintain adequate "Goods in Transit" insurance covering the full value of the products you are carrying. Your liability for a shipment begins from the moment it is picked up from the seller or our warehouse and ends upon successful delivery to the customer or a designated Partner Pay hub. Since all orders are pre-paid, your liability is focused on the physical security and integrity of the goods against loss, damage, or theft. Snazzify is not liable for the physical goods while they are in your custody. You indemnify Snazzify against any claims arising from your failure to deliver or damage to the products.</p>
                    
                    <h3>5. Data and Confidentiality</h3>
                    <p>You and your agents must maintain strict confidentiality of all customer and Partner Pay agent data, including names, addresses, and contact information. Unauthorized use or sharing of this information is a material breach of this agreement and will result in immediate termination of the partnership and potential legal action.</p>
                </CardContent>
            </Card>
        </div>
    );
}
