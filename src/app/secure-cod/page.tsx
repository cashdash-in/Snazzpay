'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { createSubscription } from '../actions';

export default function SecureCodPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        baseAmount: 0,
        quantity: 1,
        orderId: ''
    });
    const [loading, setLoading] = useState(true);
    const [isCreatingLink, setIsCreatingLink] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

    useEffect(() => {
        const amountStr = searchParams.get('amount');
        const name = searchParams.get('name');
        
        let initialAmount = 1;
        let initialName = 'Sample Product';
        let initialOrderId = `manual_${uuidv4()}`;

        if (amountStr && name) {
            const baseAmount = parseFloat(amountStr);
            if (!isNaN(baseAmount)) {
                initialAmount = baseAmount;
                initialName = name;
                initialOrderId = `prod_${name.replace(/\s+/g, '_')}`;
            } else {
                 setError('Invalid product price received.');
            }
        }

        const currentOrderDetails = {
            productName: initialName,
            baseAmount: initialAmount,
            quantity: 1,
            orderId: initialOrderId
        };

        setOrderDetails(currentOrderDetails);
        
        async function getSubscription() {
            setLoading(true);
            try {
                const result = await createSubscription();
                if (result.error) {
                    throw new Error(result.error);
                }
                setSubscriptionId(result.subscription_id!);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'An unexpected error occurred.');
                toast({ variant: 'destructive', title: 'Error', description: err.message });
            } finally {
                setLoading(false);
            }
        }

        getSubscription();
        
    }, [searchParams, toast]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value, 10);
        setOrderDetails(prev => ({
            ...prev,
            quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity
        }));
    };
    
    const handleDetailChange = (field: 'productName' | 'baseAmount', value: string) => {
        setOrderDetails(prev => ({
            ...prev,
            [field]: field === 'baseAmount' ? parseFloat(value) || 0 : value,
        }))
    }

    const totalAmount = orderDetails.baseAmount * orderDetails.quantity;

    const handlePayment = async () => {
        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must agree to the Terms and Conditions to proceed.' });
            return;
        }
        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            toast({ variant: 'destructive', title: 'Configuration Error', description: 'Razorpay Key ID is not configured.' });
            return;
        }
        if (!(window as any).Razorpay) {
            toast({ variant: 'destructive', title: 'SDK Error', description: 'Razorpay Checkout SDK failed to load. Please check your internet connection and try again.' });
            return;
        }
        if (!subscriptionId) {
            toast({ variant: 'destructive', title: 'Subscription Error', description: 'Could not create a subscription. Please refresh and try again.' });
            return;
        }
        
        setIsCreatingLink(true);

        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            subscription_id: subscriptionId,
            name: "eMandate for " + orderDetails.productName,
            description: `Mandate for Order: ${orderDetails.orderId}`,
            notes: {
                "name": orderDetails.productName,
                "quantity": orderDetails.quantity.toString(),
                "order_id_internal": orderDetails.orderId,
            },
            handler: function (response: any){
                toast({
                    title: 'Authorization Successful!',
                    description: `Payment ID: ${response.razorpay_payment_id}`,
                    variant: 'default'
                });
                
                const paymentInfo = {
                    paymentId: response.razorpay_payment_id,
                    orderId: orderDetails.orderId,
                    subscriptionId: response.razorpay_subscription_id,
                    signature: response.razorpay_signature,
                    status: 'authorized',
                    authorizedAt: new Date().toISOString()
                };

                localStorage.setItem(`payment_info_${orderDetails.orderId}`, JSON.stringify(paymentInfo));
                window.location.href = `/orders/${orderDetails.orderId}`;
            },
            prefill: {
                name: "Customer Name",
                email: "customer@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#5a31f4"
            },
            modal: {
                ondismiss: function() {
                    setIsCreatingLink(false);
                     toast({
                        variant: 'destructive',
                        title: 'Authorization Cancelled',
                        description: 'The authorization process was cancelled.',
                    });
                }
            }
        };

        try {
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch(e) {
            console.error("Razorpay SDK Error:", e);
            toast({ variant: 'destructive', title: 'SDK Error', description: 'Could not initialize Razorpay Checkout. Please check the console.' });
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
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
                        <CardTitle>Error Initializing Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">We couldn't set up the secure payment link. Please see the error below:</p>
                        <div className="mt-4 bg-destructive/10 p-3 rounded-md text-center text-destructive text-sm font-mono">
                            {error}
                        </div>
                         <p className="text-center text-muted-foreground text-xs mt-4">Please check your Razorpay API keys in the settings and ensure they are correct.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle>Secure Your COD Order</CardTitle>
                        <CardDescription>Confirm your order details and authorize a hold on your card. You will only be charged if you refuse delivery.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <Label htmlFor='productName' className="text-muted-foreground">Product/Order:</Label>
                                <Input 
                                    id="productName"
                                    value={orderDetails.productName}
                                    onChange={(e) => handleDetailChange('productName', e.target.value)}
                                    className="w-48 text-right"
                                    placeholder="e.g. Order #1001"
                                />
                            </div>
                             <div className="flex justify-between items-center">
                                <Label htmlFor='baseAmount' className="text-muted-foreground">Amount:</Label>
                                 <Input 
                                    id="baseAmount"
                                    type="number"
                                    value={orderDetails.baseAmount}
                                    onChange={(e) => handleDetailChange('baseAmount', e.target.value)}
                                    className="w-32 text-right"
                                    placeholder="0.00"
                                />
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
                        <Button className="w-full" onClick={handlePayment} disabled={!agreed || isCreatingLink || !subscriptionId}>
                            {isCreatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Authorize with Razorpay
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
