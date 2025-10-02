
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format, addYears } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';
import { getRazorpayKeyId } from '@/app/actions';
import { getCollection, saveDocument } from '@/services/firestore';
import type { ShaktiCardData } from '@/components/shakti-card';
import { sanitizePhoneNumber } from '@/lib/utils';
import { CancellationForm } from '@/components/cancellation-form';

type PaymentInfo = {
    paymentId: string;
    orderId: string; 
    razorpayOrderId: string;
    signature: string;
    status: string;
    authorizedAt: string;
};

function PaymentPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [orderDetails, setOrderDetails] = useState<{productName: string; amount: number; orderId: string; sellerId: string; prepaid: boolean;}>({
        productName: 'Loading...',
        amount: 0,
        orderId: '',
        sellerId: '',
        prepaid: false,
    });
    
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'complete'>('details');

    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 8)}`;
        const sellerId = searchParams.get('seller_id') || '';
        const prepaid = searchParams.get('prepaid') === 'true';

        setOrderDetails({ productName: name, amount, orderId, sellerId, prepaid });
        
        getRazorpayKeyId().then(key => {
            if (!key) {
                toast({ variant: 'destructive', title: "Configuration Error", description: "Razorpay Key ID is not set on the server." });
            }
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams, toast]);
    
    const createNewShaktiCard = async (order: EditableOrder) => {
        if (!order.contactNo || !order.customerEmail) return;

        const sanitizedMobile = sanitizePhoneNumber(order.contactNo);
        const cardStorageKey = `shakti_card_${sanitizedMobile}`;
        
        const existingCards = await getCollection<ShaktiCardData>('shakti_cards');
        const cardExists = existingCards.some(card => card.customerPhone === sanitizedMobile);
        if (cardExists) return;

        const newCard: ShaktiCardData = {
            cardNumber: `SHAKTI-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`,
            customerName: order.customerName,
            customerPhone: order.contactNo,
            customerEmail: order.customerEmail,
            customerAddress: order.customerAddress,
            validFrom: format(new Date(), 'MM/yy'),
            validThru: format(addYears(new Date(), 2), 'MM/yy'),
            points: 100, // Welcome bonus
            cashback: 0,
            sellerId: order.sellerId || 'snazzify',
            sellerName: 'Snazzify',
        };

        try {
            await saveDocument('shakti_cards', newCard, newCard.cardNumber);
            toast({
                title: "Shakti Card Issued!",
                description: "You've earned a Shakti Card for future benefits!",
            });
        } catch(e) {
            console.error("Failed to save Shakti Card", e);
        }
    };

    const processPayment = async () => {
        setIsSubmitting(true);
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured", description: "The payment gateway is not set up." });
             setIsSubmitting(false);
             return;
        }

        try {
            const allOrders = await getCollection<EditableOrder>('orders');
            const order = allOrders.find((o: EditableOrder) => o.id === orderDetails.orderId);

            if (!order) {
                throw new Error("Could not find the original order details. Please contact the seller.");
            }
            
            const response = await fetch('/api/create-payment-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: orderDetails.amount,
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    customerContact: order.contactNo,
                    orderId: orderDetails.orderId,
                    productName: orderDetails.productName,
                    userId: order.sellerId,
                    userRole: 'seller',
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const options = {
                key: razorpayKeyId,
                amount: orderDetails.amount * 100,
                currency: "INR",
                name: "Snazzify Seller Payment",
                description: `Payment for ${orderDetails.productName}`,
                order_id: result.order_id,
                handler: async (response: any) => {
                    const paymentStatus = 'Paid';

                    const orderToUpdate: EditableOrder = { ...order, paymentStatus };
                    await saveDocument('orders', orderToUpdate, order.id);

                    createNewShaktiCard(order);

                    toast({
                      title: "Payment Successful!",
                      description: `Your payment is ${paymentStatus}.`,
                    });
                    
                    router.refresh();
                    setStep('complete');
                },
                prefill: {
                    name: order.customerName,
                    email: order.customerEmail,
                    contact: order.contactNo,
                },
                theme: { color: "#663399" },
                modal: { ondismiss: () => setIsSubmitting(false) }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Payment Successful!</CardTitle>
                        <CardDescription>Thank you for your order! Your payment has been confirmed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The seller has been notified and will begin processing your order for dispatch. You will receive tracking details soon.</p>
                    </CardContent>
                 </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Complete Your Secure Payment</CardTitle>
                    <CardDescription>Finalizing payment for order {orderDetails.orderId}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span className="text-muted-foreground">Amount:</span><span>₹{orderDetails.amount.toFixed(2)}</span></div>
                    </div>
                     <div className="text-xs text-muted-foreground text-center">
                        This is a secure transaction powered by Razorpay.
                    </div>
                 </CardContent>
                 <CardFooter>
                    <Button className="w-full" onClick={() => processPayment()} disabled={isSubmitting || loading}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Pay ₹{orderDetails.amount.toFixed(2)} Now
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <PaymentPageContent />
        </Suspense>
    );
}
