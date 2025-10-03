
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
    const [step, setStep] = useState<'details' | 'complete'>('details');
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
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

        // Pre-fill customer details if they exist in the URL
        setCustomerDetails({
            name: searchParams.get('customerName') || '',
            email: searchParams.get('customerEmail') || '',
            contact: searchParams.get('customerContact') || '',
            address: searchParams.get('customerAddress') || '',
            pincode: searchParams.get('customerPincode') || '',
        });

        setIsSellerFlow(!!(sellerId && sellerId !== 'YOUR_UNIQUE_SELLER_ID'));
        
        setOrderDetails({ productName: name, amount, orderId, sellerId, sellerName });
        
        getRazorpayKeyId().then(key => {
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams]);

    const handleSellerFlowSubmit = async () => {
        setIsSubmitting(true);
        const { name, email, contact, address, pincode } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            setIsSubmitting(false);
            return;
        }

        try {
            const leadId = uuidv4();
            const newLead = {
                id: leadId,
                orderId: orderDetails.orderId,
                customerName: name,
                customerEmail: email,
                customerAddress: address,
                pincode: pincode,
                contactNo: contact,
                productOrdered: orderDetails.productName,
                quantity: 1,
                price: orderDetails.amount.toString(),
                date: new Date().toISOString(),
                paymentStatus: 'Lead',
                paymentMethod: paymentMethod,
                sellerId: orderDetails.sellerId,
            };
            await saveDocument('leads', newLead, leadId);
            setStep('complete');
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminFlowSubmit = async () => {
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
            // This is now a simple prepaid flow for admin
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: orderDetails.amount, 
                    productName: orderDetails.productName,
                    isAuthorization: false, // Make it a direct payment
                    name, email, contact, address, pincode
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            const uniqueInternalOrderId = result.internal_order_id;
            
            const options = {
                key: razorpayKeyId,
                amount: orderDetails.amount * 100,
                order_id: result.order_id,
                name: "Snazzify Purchase",
                description: `Payment for ${orderDetails.productName}`,
                handler: async (response: any) => {
                    const finalOrder: EditableOrder = { 
                        id: uniqueInternalOrderId, orderId: uniqueInternalOrderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode, productOrdered: orderDetails.productName, quantity: 1, price: orderDetails.amount.toString(), date: new Date().toISOString(), paymentStatus: 'Paid', source: 'Shopify', sellerId: orderDetails.sellerId
                    };
                    await saveDocument('orders', finalOrder, finalOrder.id);

                    const card = await createNewShaktiCard(finalOrder);
                    if (card) setNewlyCreatedCard(card);
                    
                    toast({ title: "Payment Successful!", description: `Order ${finalOrder.orderId} is confirmed.` });
                    setStep('complete');
                },
                prefill: { name, email, contact }, theme: { color: "#663399" }, modal: { ondismiss: () => setIsSubmitting(false) }
            };
            new (window as any).Razorpay(options).open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        const successMessage = isSellerFlow
            ? "Your order request has been sent to the seller. They will contact you shortly with a payment link or for COD confirmation."
            : "Your payment has been authorized! Your order is confirmed and you will receive shipping details soon.";
            
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>{isSellerFlow ? "Request Submitted!" : "Payment Authorized!"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{successMessage}</p>
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
        if (isSellerFlow) {
            handleSellerFlowSubmit();
        } else {
            handleAdminFlowSubmit();
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>{isSellerFlow ? "Confirm Your Order" : "Secure Your Order"}</CardTitle>
                        <CardDescription>{isSellerFlow ? `From ${orderDetails.sellerName}` : `Confirm details for order ${orderDetails.orderId}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg p-4 space-y-2 text-sm bg-muted/30">
                            <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                            <div className="flex justify-between font-bold text-lg"><span className="text-muted-foreground">Amount:</span><span>₹{orderDetails.amount.toFixed(2)}</span></div>
                        </div>

                        {customerDetailsForm}

                        {isSellerFlow && (
                            <div className="space-y-3">
                                <Label>Select Payment Method</Label>
                                <RadioGroup defaultValue="Secure Charge on Delivery" onValueChange={(value: 'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery') => setPaymentMethod(value)} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Prepaid" id="r1" /><Label htmlFor="r1">Prepaid</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Secure Charge on Delivery" id="r2" /><Label htmlFor="r2">Secure COD</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="Cash on Delivery" id="r3" /><Label htmlFor="r3">Cash on Delivery</Label></div>
                                </RadioGroup>
                            </div>
                        )}
                        
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                         <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSellerFlow ? "Submit Order Request" : "Proceed to Secure Payment"}
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
