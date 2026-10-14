'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/types/order';
import { getCollection, saveDocument, getDocument, deleteDocument } from '@/services/firestore';
import { ShaktiCard, type ShaktiCardData } from '@/components/shakti-card';
import { sanitizePhoneNumber } from '@/lib/utils';
import { format, addYears } from 'date-fns';

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
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);
    const [returnUrl, setReturnUrl] = useState('https://www.snazzify.co.in');


    const createNewShaktiCard = async (order: EditableOrder): Promise<ShaktiCardData | null> => {
        if (!order.contactNo || !order.customerEmail) return null;
        const sanitizedMobile = sanitizePhoneNumber(order.contactNo);
        try {
            const existingCards = await getCollection<ShaktiCardData>('shakti_cards');
            const cardExists = existingCards.find(card => card.customerPhone === sanitizedMobile);
            if (cardExists) return cardExists;

            const newCard: ShaktiCardData = {
                cardNumber: `SHAKTI-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`,
                customerName: order.customerName, customerPhone: order.contactNo, customerEmail: order.customerEmail, customerAddress: order.customerAddress,
                validFrom: format(new Date(), 'MM/yy'), validThru: format(addYears(new Date(), 2), 'MM/yy'),
                points: 100, cashback: 0, sellerId: order.sellerId || 'snazzify', sellerName: 'Snazzify',
            };
            await saveDocument('shakti_cards', newCard, newCard.cardNumber);
            return newCard;
        } catch(e) {
            console.error("Failed to save or find Shakti Card", e);
            return null;
        }
    };


    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 8)}`;
        const sellerId = searchParams.get('seller_id') || '';
        const prepaid = searchParams.get('prepaid') === 'true';
        const backUrl = searchParams.get('return_url');
        if (backUrl) setReturnUrl(backUrl);

        setOrderDetails({ productName: name, amount, orderId, sellerId, prepaid });
        
        async function fetchKey() {
            try {
                const response = await fetch('/api/get-key');
                if (!response.ok) throw new Error('Failed to fetch key');
                const { keyId } = await response.json();
                setRazorpayKeyId(keyId);
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: "Network Error" });
            } finally {
                setLoading(false);
            }
        }
        fetchKey();
    }, [searchParams, toast]);

    const processPayment = async () => {
        setIsSubmitting(true);
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured" });
             setIsSubmitting(false);
             return;
        }

        try {
            const lead = await getDocument<EditableOrder>('leads', orderDetails.orderId);
            if (!lead) throw new Error("Order request not found.");
            
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: orderDetails.amount, 
                    productName: `Prepaid for ${orderDetails.productName}`,
                    isAuthorization: false,
                    name: lead.customerName, email: lead.customerEmail, contact: lead.contactNo, address: lead.customerAddress, pincode: lead.pincode
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            const uniqueInternalOrderId = result.internal_order_id;

            const options = {
                key: razorpayKeyId,
                amount: orderDetails.amount * 100,
                currency: "INR",
                name: "Snazzify Seller Payment",
                description: `Payment for ${orderDetails.productName}`,
                order_id: result.order_id,
                handler: async (response: any) => {
                    const finalOrder: EditableOrder = { ...lead, id: uniqueInternalOrderId, orderId: uniqueInternalOrderId, paymentStatus: 'Paid', source: 'Catalogue' };
                    await saveDocument('orders', finalOrder, finalOrder.id);
                    await deleteDocument('leads', lead.id);
                    const card = await createNewShaktiCard(finalOrder);
                    if (card) setNewlyCreatedCard(card);
                    setStep('complete');
                },
                prefill: { name: lead.customerName, email: lead.customerEmail, contact: lead.contactNo },
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

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    
    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Payment Successful!</CardTitle>
                        <CardDescription>Thank you! Your payment has been confirmed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">The seller will process your order soon.</p>
                        {newlyCreatedCard && (
                            <div className="pt-4 border-t"><h4 className="font-semibold mb-2">Your Shakti Card is Ready!</h4><div className="flex justify-center"><ShaktiCard card={newlyCreatedCard} /></div></div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Link href="/customer/login" className="w-full"><Button className="w-full">Go to Customer Portal</Button></Link>
                        <Button className="w-full" variant="outline" onClick={() => window.location.href = returnUrl}>Return to Store</Button>
                    </CardFooter>
                 </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle>Complete Your Payment</CardTitle>
                    <CardDescription>Ref: {orderDetails.orderId}</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="border rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span className="text-muted-foreground">Amount:</span><span>₹{orderDetails.amount.toFixed(2)}</span></div>
                    </div>
                 </CardContent>
                 <CardFooter>
                    <Button className="w-full" onClick={processPayment} disabled={isSubmitting}>
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
