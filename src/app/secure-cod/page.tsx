
'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/app/orders/page';
import { getRazorpayKeyId } from '@/app/actions';
import { addDocument, saveDocument, getCollection, getDocument, deleteDocument } from '@/services/firestore';
import { format, addYears } from 'date-fns';
import { ShaktiCard, type ShaktiCardData } from '@/components/shakti-card';
import { sanitizePhoneNumber } from '@/lib/utils';
import { CancellationForm } from '@/components/cancellation-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type CustomerDetails = {
    name: string;
    email: string;
    contact: string;
    address: string;
    pincode: string;
    alternateContact?: string;
    landmark?: string;
};

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

    const [isSellerFlow, setIsSellerFlow] = useState(false);
    const [orderDetails, setOrderDetails] = useState({
        productName: 'Loading...',
        amount: 0,
        orderId: '',
        sellerId: '',
        sellerName: '',
    });
    
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'payment' | 'complete'>('details');
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);


    const createNewShaktiCard = async (order: EditableOrder): Promise<ShaktiCardData | null> => {
        if (!order.contactNo || !order.customerEmail) return null;

        const sanitizedMobile = sanitizePhoneNumber(order.contactNo);
        
        try {
            const existingCards = await getCollection<ShaktiCardData>('shakti_cards');
            const cardExists = existingCards.find(card => card.customerPhone === sanitizedMobile);
            if (cardExists) {
                console.log("Shakti Card already exists for this customer.");
                return cardExists; // Return existing card
            }

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
            
            await saveDocument('shakti_cards', newCard, newCard.cardNumber);
            toast({
                title: "Shakti Card Issued!",
                description: "You've earned a Shakti Card for future benefits!",
            });
            return newCard;
        } catch(e) {
            console.error("Failed to save or find Shakti Card", e);
            return null;
        }
    };

    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `LEGACY-${uuidv4().substring(0, 4)}`.toUpperCase();
        const sellerId = searchParams.get('seller_id') || '';
        const sellerName = searchParams.get('seller_name') || '';

        // Determine the flow based on the presence of a seller_id
        setIsSellerFlow(!!(sellerId && sellerId !== 'YOUR_UNIQUE_SELLER_ID'));
        
        setOrderDetails({ productName: name, amount, orderId, sellerId, sellerName });
        
        getRazorpayKeyId().then(key => {
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams]);
    
    // Simple, one-step prepaid flow
    const handleSimplePrepaidFlow = async () => {
        setIsSubmitting(true);
        const { name, email, contact, address, pincode } = customerDetails;

        if (!name || !email || !contact || !address || !pincode) {
             toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out all required fields." });
             setIsSubmitting(false);
             return;
        }
        
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured" });
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
                    isAuthorization: false, // Prepaid, so capture immediately
                    name, email, contact, address, pincode
                })
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            const uniqueInternalOrderId = result.internal_order_id;

            const options = {
                key: razorpayKeyId,
                amount: orderDetails.amount * 100,
                currency: "INR",
                name: "Snazzify Order Payment",
                description: `Payment for ${orderDetails.productName}`,
                order_id: result.order_id,
                handler: async (response: any) => {
                     const newOrder: EditableOrder = {
                        id: uniqueInternalOrderId,
                        orderId: uniqueInternalOrderId,
                        customerName: name, customerEmail: email, customerAddress: address, pincode, contactNo: contact,
                        productOrdered: orderDetails.productName,
                        quantity: 1,
                        price: orderDetails.amount.toString(),
                        date: new Date().toISOString(),
                        paymentStatus: 'Paid',
                        source: isSellerFlow ? 'Seller' : 'Shopify',
                        sellerId: orderDetails.sellerId,
                    };
                    
                    await saveDocument('orders', newOrder, newOrder.id);
                    
                    const paymentInfo = {
                        paymentId: response.razorpay_payment_id,
                        orderId: uniqueInternalOrderId,
                        razorpayOrderId: response.razorpay_order_id,
                        status: 'captured',
                        authorizedAt: new Date().toISOString()
                    };
                    await saveDocument('payment_info', paymentInfo, newOrder.id);

                    const card = await createNewShaktiCard(newOrder);
                    if (card) setNewlyCreatedCard(card);

                    toast({ title: "Payment Successful!", description: `Your order ${uniqueInternalOrderId} is confirmed.` });
                    setStep('complete');
                },
                prefill: { name, email, contact },
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
    
    // Robust, two-step verification flow 
    const handleTwoStepVerificationFlow = async () => {
        setIsSubmitting(true);
        const { name, email, contact, address, pincode } = customerDetails;

        if (!name || !email || !contact || !address || !pincode) {
             toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out all required fields." });
             setIsSubmitting(false);
             return;
        }
        
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured" });
             setIsSubmitting(false);
             return;
        }

        try {
            // STEP 1: Create a ₹1 Intent Verification Order
            const intentResult = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: 1, 
                    productName: `Intent Verification for ${orderDetails.productName}`,
                    isAuthorization: false, // This is a capture, not an authorization
                    name, email, contact, address, pincode
                })
            }).then(res => res.json());
            
            if (intentResult.error) throw new Error(intentResult.error);

            // Create a temporary lead entry in Firestore
            const tempLeadId = intentResult.internal_order_id || uuidv4();
            const tempLead: EditableOrder = {
                id: tempLeadId,
                orderId: tempLeadId,
                customerName: name, customerEmail: email, customerAddress: address, pincode, contactNo: contact,
                productOrdered: orderDetails.productName, quantity: 1, price: orderDetails.amount.toString(),
                date: new Date().toISOString(), paymentStatus: 'Intent Verified', source: isSellerFlow ? 'Seller' : 'Shopify', sellerId: orderDetails.sellerId
            };
            await saveDocument('leads', tempLead, tempLeadId);

            const optionsIntent = {
                key: razorpayKeyId,
                amount: 100, // ₹1 in paise
                currency: "INR",
                name: "Snazzify Order Verification",
                description: `Verify intent for Order #${orderDetails.orderId}`,
                order_id: intentResult.order_id,
                handler: async (intentResponse: any) => {
                    // STEP 2: Intent Successful, now create full authorization order
                    const authResult = await fetch('/api/create-mandate-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            amount: orderDetails.amount, 
                            productName: orderDetails.productName, 
                            isAuthorization: true, // This IS an authorization
                            name, email, contact, address, pincode
                        })
                    }).then(res => res.json());

                    if (authResult.error) throw new Error(authResult.error);
                    
                    const uniqueInternalOrderId = authResult.internal_order_id;

                    const optionsAuth = {
                        key: razorpayKeyId,
                        amount: orderDetails.amount * 100,
                        order_id: authResult.order_id,
                        name: "Authorize Secure COD Payment",
                        description: `Authorize ₹${orderDetails.amount} for Order #${uniqueInternalOrderId}`,
                        handler: async (authResponse: any) => {
                            // Update lead to a full order
                            const finalOrder: EditableOrder = { 
                                ...tempLead,
                                id: uniqueInternalOrderId,
                                orderId: uniqueInternalOrderId,
                                paymentStatus: 'Authorized',
                            };
                            await saveDocument('orders', finalOrder, finalOrder.id);
                            
                            // Delete the temporary lead
                            await deleteDocument('leads', tempLeadId);

                            const paymentInfo: PaymentInfo = {
                                paymentId: authResponse.razorpay_payment_id, 
                                orderId: uniqueInternalOrderId, 
                                razorpayOrderId: authResponse.razorpay_order_id,
                                signature: authResponse.razorpay_signature, 
                                status: 'authorized', 
                                authorizedAt: new Date().toISOString()
                            };
                            await saveDocument('payment_info', paymentInfo, finalOrder.id);
                            
                            const card = await createNewShaktiCard(finalOrder);
                            if (card) setNewlyCreatedCard(card);
                            
                            toast({ title: "Payment Authorized!", description: `Order ${finalOrder.orderId} is confirmed.` });
                            setStep('complete');
                        },
                        prefill: { name, email, contact },
                        theme: { color: "#663399" },
                        modal: { ondismiss: () => setIsSubmitting(false) }
                    };
                    const rzpAuth = new (window as any).Razorpay(optionsAuth);
                    rzpAuth.open();
                },
                prefill: { name, email, contact },
                theme: { color: "#663399" },
                modal: { ondismiss: () => setIsSubmitting(false) }
            };
            const rzpIntent = new (window as any).Razorpay(optionsIntent);
            rzpIntent.open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>{isSellerFlow ? "Your payment has been authorized!" : "Your payment was successful."}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{isSellerFlow ? "Your order is confirmed. You will receive shipping and tracking details soon." : "The seller has been notified and will process your order."}</p>
                        {newlyCreatedCard && (
                            <div className="pt-4 border-t">
                                <h4 className="font-semibold mb-2">Your Shakti COD Card is Ready!</h4>
                                <div className="flex justify-center">
                                    <ShaktiCard card={newlyCreatedCard} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Link href="/customer/login" className="w-full">
                            <Button className="w-full">Go to Customer Portal</Button>
                        </Link>
                         <a href="https://www.snazzify.co.in" className="w-full">
                            <Button className="w-full" variant="outline">Continue Shopping</Button>
                        </a>
                    </CardFooter>
                 </Card>
            </div>
        )
    }
    
    const customerDetailsForm = (
         <div className="space-y-4">
            <div className="space-y-2">
                 <Label htmlFor="name">Full Name</Label>
                 <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="pl-9" /></div>
            </div>
             <div className="space-y-2">
                 <Label htmlFor="contact">Contact Number</Label>
                 <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="contact" type="tel" required value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="pl-9" /></div>
            </div>
             <div className="space-y-2">
                 <Label htmlFor="email">Email Address</Label>
                 <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" required value={customerDetails.email} onChange={e => setCustomerDetails({...customerDetails, email: e.target.value})} className="pl-9" /></div>
            </div>
             <div className="space-y-2">
                 <Label htmlFor="address">Full Delivery Address</Label>
                 <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="address" required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="pl-9" /></div>
            </div>
             <div className="space-y-2">
                 <Label htmlFor="pincode">Pincode</Label>
                 <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="pincode" required value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="pl-9" /></div>
            </div>
        </div>
    );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        // Super Admin (no seller_id) gets the two-step flow.
        // Seller links get the simple prepaid flow.
        if (isSellerFlow) {
             handleSimplePrepaidFlow();
        } else {
             handleTwoStepVerificationFlow();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>{!isSellerFlow ? "Secure Your Order" : "Secure COD Checkout"}</CardTitle>
                        <CardDescription>{!isSellerFlow ? `Confirm details for order ${orderDetails.orderId}` : `From ${orderDetails.sellerName}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg p-4 space-y-2 text-sm bg-muted/30">
                            <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                            <div className="flex justify-between font-bold text-lg"><span className="text-muted-foreground">Amount:</span><span>₹{orderDetails.amount.toFixed(2)}</span></div>
                        </div>

                        {customerDetailsForm}
                        
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                         <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {!isSellerFlow ? "Proceed to Secure Payment" : "Proceed to Payment"}
                        </Button>
                        {!isSellerFlow && <p className="text-xs text-muted-foreground text-center">You will first be charged ₹1 to verify your card. The full amount will be authorized next.</p>}
                        <div className="flex items-center justify-center space-x-4 text-sm mt-2">
                            <Link href="/customer/login" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1">Customer Login</span></Link>
                            <Link href="/faq" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How this works</span></Link>
                        </div>
                    </CardFooter>
                </form>
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

    