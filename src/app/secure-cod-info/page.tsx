
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function SecureCodInfoPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>What is Secure Cash on Delivery?</CardTitle>
                    <CardDescription>Building trust and ensuring commitment for your COD orders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-left">
                        <p className="text-muted-foreground mb-4">
                            Secure COD is a way for you to confirm your Cash on Delivery (COD) order by pre-authorizing the payment. It helps us ensure that COD orders are genuine, which in turn helps us serve you better.
                        </p>
                        
                        <h4 className="font-semibold text-lg mb-2">How It Works:</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Pre-authorize, Don't Pay:</span> You authorize a temporary hold for the order amount on your card or bank account via Razorpay eMandate. No money is deducted at this time.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Pay on Delivery:</span> As usual, you only pay the full amount in cash when your order arrives at your doorstep.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Automatic Release:</span> Once you pay our delivery agent, the hold on your card is automatically released.</span>
                            </li>
                        </ul>

                        <h4 className="font-semibold text-lg mt-6 mb-2">Why should you use it?</h4>
                         <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Priority Processing:</span> Your order gets confirmed instantly and is often processed faster.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Builds Trust:</span> It shows your commitment to the order, which helps us reduce fraudulent orders and keep our prices competitive.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Complete Security:</span> The process is handled by Razorpay, one of India's most trusted payment gateways. Your financial details are 100% secure.</span>
                            </li>
                        </ul>
                         <p className="text-xs text-muted-foreground text-center mt-6">
                            You will only be charged if the delivery is refused or the order is cancelled after it has been shipped.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
