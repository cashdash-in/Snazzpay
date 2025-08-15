
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle } from "lucide-react";
import { createSubscriptionLink } from '@/services/razorpay';
import { useToast } from '@/hooks/use-toast';

export default function SecureCodPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        baseAmount: 0,
        quantity: 1,
    });
    const [loading, setLoading] = useState(true);
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        const amount = searchParams.get('amount');
        const name = searchParams.get('name');
        
        if (!amount || !name) {
            setError('Missing product details. This page should be accessed from your Shopify store product page.');
            setLoading(false);
            return;
        }

        const baseAmount = parseFloat(amount);
        if (isNaN(baseAmount)) {
            setError('Invalid product price received.');
            setLoading(false);
            return;
        }

        setOrderDetails({
            productName: name,
            baseAmount: baseAmount,
            quantity: 1,
        });
        setLoading(false);
    }, [searchParams]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value, 10);
        setOrderDetails(prev => ({
            ...prev,
            quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity
        }));
    };

    const totalAmount = orderDetails.baseAmount * orderDetails.quantity;

    const handlePayment = async () => {
        setIsCreatingLink(true);
        try {
            const amountInPaise = Math.round(totalAmount * 100);
            const result = await createSubscriptionLink(amountInPaise, orderDetails.productName);

            if (result.success && result.url) {
                window.location.href = result.url;
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Could not create mandate link. Please try again.',
                });
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setIsCreatingLink(false);
        }
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
                    <CardDescription>Confirm your order details and authorize a hold on your card. You will only be charged if you refuse delivery.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Product:</span>
                            <span className="font-medium text-right">{orderDetails.productName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="quantity" className="text-muted-foreground">Quantity:</Label>
                            <Input 
                                id="quantity"
                                type="number"
                                value={orderDetails.quantity}
                                onChange={handleQuantityChange}
                                className="w-20 text-center"
                                min="1"
                            />
                        </div>
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-muted-foreground">Total Amount:</span>
                            <span className="font-bold">₹{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                     <div className="text-center">
                        <Link href="/faq" passHref>
                           <span className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                                <HelpCircle className="h-4 w-4" />
                                Frequently Asked Questions
                            </span>
                        </Link>
                    </div>
                     <div className="flex items-center space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">
                            I agree to the{" "}
                            <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">
                                Terms and Conditions
                            </Link>
                            .
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        By clicking the button below, you agree to authorize a temporary hold of ₹{totalAmount.toFixed(2)} on your card via Razorpay eMandate. This hold may be partially captured for a shipping fee if the order is canceled after dispatch.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handlePayment} disabled={!agreed || isCreatingLink}>
                        {isCreatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Authorize with Razorpay
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
