
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/app/orders/page';
import { getRazorpayKeyId } from '@/app/actions';
import { saveOrder, savePaymentInfo } from '@/services/firestore';
import { format, addYears } from 'date-fns';
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


function SecureCodPaymentForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [orderDetails, setOrderDetails] = useState<{productName: string; amount: number; orderId: string, sellerId?: string | null, sellerName?: string | null}>({
        productName: 'Loading...',
        amount: 0,
        orderId: '',
        sellerId: null,
        sellerName: null,
    });
    
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'form' | 'complete'>('form');

    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 8)}`;
        const sellerId = searchParams.get('seller_id');
        const sellerName = searchParams.get('seller_name');

        setOrderDetails({ productName: name, amount, orderId, sellerId, sellerName });
        
        getRazorpayKeyId().then(key => {
            if (!key) {
                toast({ variant: 'destructive', title: "Configuration Error", description: "Razorpay Key ID is not set on the server." });
            }
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams, toast]);
    
     const createNewShaktiCard = (order: EditableOrder) => {
        if (!order.contactNo || !order.customerEmail) return;

        const sanitizedMobile = sanitizePhoneNumber(order.contactNo);
        const cardStorageKey = `shakti_card_${sanitizedMobile}`;
        
        // This part needs to be migrated to Firestore
        // For now, we simulate by checking if a card exists for this phone number
        // const existingCard = await getShaktiCardByPhone(sanitizedMobile);
        // if(existingCard) return;

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
            sellerName: order.sellerName || 'Snazzify',
        };
        
        // This would be a Firestore call
        // await saveShaktiCard(newCard);
        
        toast({
            title: "Shakti Card Issued!",
            description: "You've earned a Shakti Card for future benefits! Check your customer dashboard.",
        });
    };

    const handleSuccess = async (response: any, isAuthorization: boolean, customerDetails: any) => {
        const paymentStatus = isAuthorization ? 'Authorized' : 'Paid';
        
        const newOrder: EditableOrder = {
            id: uuidv4(),
            orderId: orderDetails.orderId,
            customerName: customerDetails.name,
            customerEmail: customerDetails.email,
            customerAddress: customerDetails.address,
            pincode: customerDetails.pincode,
            contactNo: customerDetails.contact,
            productOrdered: orderDetails.productName,
            quantity: 1, // Assuming 1 for now
            price: orderDetails.amount.toFixed(2),
            paymentStatus,
            date: new Date().toISOString(),
            source: orderDetails.sellerId ? 'Seller' : 'Shopify',
            sellerId: orderDetails.sellerId || undefined,
            sellerName: orderDetails.sellerName || undefined,
        };

        const paymentInfo: PaymentInfo = {
            paymentId: response.razorpay_payment_id,
            orderId: orderDetails.orderId,
            razorpayOrderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            status: 'authorized',
            authorizedAt: new Date().toISOString(),
        };

        try {
            await saveOrder(newOrder);
            await savePaymentInfo(newOrder.orderId, paymentInfo);
            createNewShaktiCard(newOrder);
            
            toast({
              title: "Payment Successful!",
              description: `Your payment is ${paymentStatus}. Order ${newOrder.orderId} has been confirmed.`,
            });
            
            router.refresh();
            setStep('complete');

        } catch (dbError: any) {
             toast({
              variant: 'destructive',
              title: "Database Error",
              description: `Your payment was successful but we failed to save the order: ${dbError.message}`,
            });
        }
    };


    const startPayment = async (isAuthorization: boolean, customerDetails: any) => {
        setIsSubmitting(true);
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured", description: "The payment gateway is not set up." });
             setIsSubmitting(false);
             return;
        }

        try {
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: orderDetails.amount,
                    productName: orderDetails.productName,
                    customerName: customerDetails.name,
                    customerEmail: customerDetails.email,
                    customerContact: customerDetails.contact,
                    customerAddress: customerDetails.address,
                    customerPincode: customerDetails.pincode,
                    isAuthorization,
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            const options = {
                key: razorpayKeyId,
                amount: orderDetails.amount * 100,
                currency: "INR",
                name: "Snazzify Secure Payment",
                description: `Payment for ${orderDetails.productName}`,
                order_id: result.order_id,
                handler: (response: any) => handleSuccess(response, isAuthorization, customerDetails),
                prefill: {
                    name: customerDetails.name,
                    email: customerDetails.email,
                    contact: customerDetails.contact,
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
    
    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Payment Successful!</CardTitle>
                        <CardDescription>Thank you! Your order #{orderDetails.orderId} is confirmed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">You will receive shipping and tracking details soon.</p>
                    </CardContent>
                     <CardFooter>
                        <a href="https://www.snazzify.co.in" className="w-full">
                            <Button className="w-full">Continue Shopping</Button>
                        </a>
                    </CardFooter>
                 </Card>
            </div>
        )
    }

    // Since this page is now the direct payment gateway, it doesn't need a complex form.
    // It will trigger payment on load or with a simple button, using details from the URL.
    // This is a simplified version. A real app would have a form here to collect customer details first.
    
    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
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
                     <p className="text-xs text-muted-foreground text-center">By clicking below, you agree to our terms and conditions.</p>
                 </CardContent>
                 <CardFooter className="flex flex-col gap-4">
                    <Button 
                        className="w-full" 
                        onClick={() => startPayment(true, { name: 'Customer', email: 'email@example.com', contact: '9999999999', address: 'N/A', pincode: 'N/A' })} 
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Pay ₹{orderDetails.amount.toFixed(2)} with Secure COD
                    </Button>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                        <Link href="/customer/login" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1">Customer Login</span></Link>
                        <Link href="/faq" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How this works</span></Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

function Page() {
    return (
       <div className="relative min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <SecureCodPaymentForm />
            </Suspense>
            <Suspense>
                 <CancellationForm />
            </Suspense>
        </div>
    );
}

export default Page;


    