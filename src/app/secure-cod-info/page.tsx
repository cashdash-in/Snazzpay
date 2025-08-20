
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle, Wallet, Zap } from "lucide-react";

export default function SecureCodInfoPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                     <Zap className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Welcome to Secure COD: The Modern Way to Pay</CardTitle>
                    <CardDescription>A safer, faster, and more reliable way to complete your order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-left">
                        <p className="text-muted-foreground mb-4">
                           Forget the hassle and risk of handling cash. Our Secure COD is an innovative payment method where you pay for your order upfront. Your payment is held securely in your personal Snazzify Trust Wallet and is only transferred to us after we dispatch your order.
                        </p>
                        
                        <h4 className="font-semibold text-lg mb-2">How It Works:</h4>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Pay Upfront Securely:</span> You complete the payment now. No need to worry about having cash ready for the courier.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Funds Held in Trust Wallet:</span> Your money is held in your personal, secure Snazzify Trust Wallet, powered by Razorpay.</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Funds Transferred on Dispatch:</span> We only transfer the payment to our account after your product has been dispatched. This is our commitment to you.</span>
                            </li>
                        </ul>

                        <h4 className="font-semibold text-lg mt-6 mb-2">Why is this one-of-a-kind?</h4>
                         <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Reduces Fraud:</span> This model confirms genuine orders, which helps us fight fraud and keep our prices competitive for you.</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Flexible Cancellation:</span> You can cancel your order any time before it's dispatched, and even up to 3 days after delivery (service fee applies).</span>
                            </li>
                             <li className="flex items-start">
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-1 flex-shrink-0" />
                                <span><span className="font-semibold text-foreground">Priority Processing:</span> Your confirmed, pre-paid order gets the highest priority for packing and shipping.</span>
                            </li>
                        </ul>
                         <p className="text-xs text-muted-foreground text-center mt-6">
                            This modern payment solution is designed for your peace of mind and security.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
