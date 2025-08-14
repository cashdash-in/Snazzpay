
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SecureCodPage() {
    const searchParams = useSearchParams();
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        amount: '0',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const amount = searchParams.get('amount');
        const name = searchParams.get('name');
        
        if (!amount || !name) {
            setError('Missing product details. This page should be accessed from your Shopify store product page.');
            setLoading(false);
            return;
        }

        setOrderDetails({
            productName: name,
            amount: amount,
        });
        setLoading(false);
    }, [searchParams]);

    const handlePayment = () => {
        // Here you would integrate with Razorpay to create and open the mandate link.
        // This is a placeholder for the actual integration.
        alert(`Redirecting to Razorpay to secure COD for Product: ${orderDetails.productName} of amount ₹${orderDetails.amount}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-red-500">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Secure Your COD Order</CardTitle>
                    <CardDescription>Authorize a hold on your card. You will only be charged if you refuse delivery.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Product:</span>
                            <span className="font-medium">{orderDetails.productName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-medium">₹{parseFloat(orderDetails.amount).toFixed(2)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        By clicking the button below, you agree to authorize a temporary hold of ₹{parseFloat(orderDetails.amount).toFixed(2)} on your card via Razorpay eMandate.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handlePayment}>
                        Authorize with Razorpay
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
