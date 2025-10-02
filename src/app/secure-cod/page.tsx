
'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, Package } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/app/orders/page';
import { getRazorpayKeyId } from '@/app/actions';
import { addDocument, saveDocument, getDocument } from '@/services/firestore';
import { format, addYears } from 'date-fns';
import type { ShaktiCardData } from '@/components/shakti-card';
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

type PaymentMethod = 'Prepaid' | 'Cash on Delivery';

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
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Prepaid');


    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 8)}`;
        const sellerId = searchParams.get('seller_id') || '';
        const sellerName = searchParams.get('seller_name') || '';

        setIsSellerFlow(!!sellerId);
        
        setOrderDetails({ productName: name, amount, orderId, sellerId, sellerName });
        
        getRazorpayKeyId().then(key => {
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams]);
    
    const handleSellerFlowSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const { name, email, contact, address, pincode } = customerDetails;
        if (!name || !email || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out all required fields." });
            return;
        }
        setIsSubmitting(true);
        try {
            const newLead = {
                id: uuidv4(),
                orderId: orderDetails.orderId,
                customerName: name,
                customerEmail: email,
                customerAddress: `${address}, Landmark: ${customerDetails.landmark || 'N/A'}`,
                pincode: pincode,
                contactNo: contact,
                productOrdered: orderDetails.productName,
                quantity: 1,
                price: orderDetails.amount.toString(),
                date: new Date().toISOString(),
                sellerId: orderDetails.sellerId,
                paymentStatus: 'Lead',
                paymentMethod: paymentMethod,
            };
            
            await addDocument('leads', newLead);
            
            toast({
                title: "Order Request Sent!",
                description: `Your request has been sent to ${orderDetails.sellerName}. They will contact you shortly.`,
            });
            setStep('complete');

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Submission Failed", description: error.message || 'Could not submit your order request.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // This is the original flow for the main website
    const handleAdminFlowSubmit = async () => {
        setIsSubmitting(true);
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured", description: "The payment gateway is not set up." });
             setIsSubmitting(false);
             return;
        }

        const newLead: EditableOrder = {
            id: orderDetails.orderId, // Use the order ID as doc ID
            orderId: orderDetails.orderId,
            customerName: customerDetails.name,
            customerEmail: customerDetails.email,
            customerAddress: `${customerDetails.address}, ${customerDetails.landmark || ''}`,
            pincode: customerDetails.pincode,
            contactNo: customerDetails.contact,
            productOrdered: orderDetails.productName,
            quantity: 1,
            price: orderDetails.amount.toFixed(2),
            paymentStatus: 'Intent Verified',
            date: new Date().toISOString(),
            source: 'Shopify',
        };

        try {
            const [intentResult, authResult] = await Promise.all([
                fetch('/api/create-mandate-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...customerDetails, amount: 1, productName: `Intent - ${orderDetails.productName}` })
                }).then(res => res.json()),
                fetch('/api/create-mandate-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...customerDetails, amount: orderDetails.amount, productName: orderDetails.productName, isAuthorization: true })
                }).then(res => res.json())
            ]);
            
            if (intentResult.error || authResult.error) throw new Error(intentResult.error || authResult.error || 'Failed to create Razorpay orders.');
            
            const triggerFullAuthorization = () => {
                const authOptions = {
                    key: razorpayKeyId, amount: orderDetails.amount * 100, currency: "INR", name: "Authorize Full Amount",
                    description: `Authorize ₹${orderDetails.amount} for Order #${orderDetails.orderId}`, order_id: authResult.order_id,
                    handler: async (response: any) => {
                        const finalOrder: EditableOrder = { ...newLead, paymentStatus: 'Authorized', source: 'Shopify' };
                        const paymentInfo: PaymentInfo = {
                            paymentId: response.razorpay_payment_id, orderId: orderDetails.orderId, razorpayOrderId: response.razorpay_order_id,
                            signature: response.razorpay_signature, status: 'authorized', authorizedAt: new Date().toISOString()
                        };
                        await saveDocument('orders', finalOrder, finalOrder.id);
                        await saveDocument('payment_info', paymentInfo, finalOrder.orderId);
                        
                        const leadDoc = await getDocument('leads', newLead.id);
                        if(leadDoc) await saveDocument('leads', { ...newLead, paymentStatus: 'Converted' }, newLead.id);
                        
                        toast({ title: "Payment Successful!", description: `Your payment is Authorized. Order ${finalOrder.orderId} confirmed.` });
                        setStep('complete');
                    },
                    prefill: { name: customerDetails.name, email: customerDetails.email, contact: customerDetails.contact },
                    theme: { color: "#663399" },
                    modal: { ondismiss: () => {
                        toast({ title: 'Authorization Pending', description: 'Your order is saved as a lead. Please complete the authorization later.'});
                        setIsSubmitting(false); router.push('/customer/dashboard');
                    }}
                };
                const rzpAuth = new (window as any).Razorpay(authOptions);
                rzpAuth.open();
            }

            const intentOptions = {
                key: razorpayKeyId, amount: 100, currency: "INR", name: "Verify Order Intent",
                description: `₹1 verification for Order #${orderDetails.orderId}`, order_id: intentResult.order_id,
                handler: async () => {
                    await saveDocument('leads', newLead, newLead.id);
                    triggerFullAuthorization();
                },
                prefill: { name: customerDetails.name, email: customerDetails.email, contact: customerDetails.contact },
                theme: { color: "#663399" },
                modal: { ondismiss: () => {
                    toast({ title: 'Verification Incomplete', description: 'Your order was not confirmed. Please try again.' });
                    setIsSubmitting(false); setStep('details');
                }}
            };
            const rzpIntent = new (window as any).Razorpay(intentOptions);
            rzpIntent.open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false); setStep('details');
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
                        <CardDescription>{isSellerFlow ? "Your request has been sent to the seller." : "Your order is confirmed."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{isSellerFlow ? "The seller will contact you shortly to confirm details and arrange payment." : "Your payment has been securely authorized. You will receive shipping and tracking details soon."}</p>
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

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <form onSubmit={isSellerFlow ? handleSellerFlowSubmit : (e) => { e.preventDefault(); handleAdminFlowSubmit(); }}>
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>{isSellerFlow ? "Place Your Order" : "Secure COD Checkout"}</CardTitle>
                        <CardDescription>{isSellerFlow ? `Order from ${orderDetails.sellerName}` : `Confirm details for order ${orderDetails.orderId}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border rounded-lg p-4 space-y-2 text-sm bg-muted/30">
                            <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                            <div className="flex justify-between font-bold text-lg"><span className="text-muted-foreground">Amount:</span><span>₹{orderDetails.amount.toFixed(2)}</span></div>
                        </div>

                        {customerDetailsForm}

                        {isSellerFlow && (
                             <div className="space-y-3">
                                <Label>Select Payment Type</Label>
                                <RadioGroup defaultValue="Prepaid" onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Prepaid" id="r1" />
                                        <Label htmlFor="r1">Prepaid</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Cash on Delivery" id="r2" />
                                        <Label htmlFor="r2">Cash on Delivery</Label>
                                    </div>
                                </RadioGroup>
                                <p className="text-xs text-muted-foreground">The seller will contact you to arrange payment or confirm your COD order.</p>
                            </div>
                        )}
                        
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                         <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isSellerFlow ? "Send Order Request" : "Proceed to Secure Payment"}
                        </Button>
                        {!isSellerFlow && <p className="text-xs text-muted-foreground text-center">You'll first verify with a refundable ₹1 payment, then authorize the full amount.</p>}
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

    
