
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { AnimatedCodSteps } from "@/components/animated-cod-steps";

export default function SecureCodInfoPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="w-full max-w-4xl">
                <Card className="shadow-lg mb-8">
                    <CardHeader className="text-center">
                         <Zap className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>Welcome to Secure COD: The Modern Way to Pay</CardTitle>
                        <CardDescription>A safer, faster, and more reliable way to complete your order.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-center">
                           Forget the hassle and risk of handling cash. Our Secure COD is an innovative payment method where you pay for your order upfront. Your payment is held securely in your personal Snazzify Trust Wallet and is only transferred to us after we dispatch your order.
                        </p>
                    </CardContent>
                </Card>
                
                <h2 className="text-2xl font-bold text-center mb-4">How It Works: Step-by-Step</h2>
                <AnimatedCodSteps />

            </div>
        </div>
    );
}
