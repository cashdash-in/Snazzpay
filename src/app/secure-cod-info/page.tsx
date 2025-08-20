
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle, Wallet } from "lucide-react";

export default function SecureCodInfoPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                     <Wallet className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>What is the Snazzify Trust Wallet?</CardTitle>
                    <CardDescription>A secure way to confirm your COD order and reduce fraud.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-left">
                        <p className="text-muted-foreground mb-4">
                           The Snazzify Trust Wallet is designed to make Cash on Delivery (COD) orders more secure for both you and us. By authorizing the order amount, you are holding the funds in your personal, secure Trust Wallet. This confirms your order and protects against fraud.
                        </p>
                        
                        <h4 className="font-semibold text-lg mb-2">How It Works:</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Secure Funds in Wallet:</span> You authorize a temporary hold for the order amount. These funds are secured in your personal Trust Wallet, not paid to us.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Pay on Delivery:</span> As usual, you only pay the full amount in cash when your order arrives at your doorstep.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Automatic Release:</span> Once you pay our delivery agent, the funds held in your Trust Wallet are automatically released back to your original account.</span>
                            </li>
                        </ul>

                        <h4 className="font-semibold text-lg mt-6 mb-2">Why should you use it?</h4>
                         <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Priority Processing:</span> Your order gets confirmed instantly and is processed with priority.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Reduces Fraud:</span> It shows your commitment to the order, which helps us reduce fraudulent orders and keep our prices competitive for genuine customers like you.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Complete Security:</span> The process is handled by Razorpay, one of India's most trusted payment gateways. Your financial details are 100% secure.</span>
                            </li>
                        </ul>
                         <p className="text-xs text-muted-foreground text-center mt-6">
                            Funds from your wallet are only used to cover shipping fees if the delivery is refused or the order is cancelled after it has been shipped.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
