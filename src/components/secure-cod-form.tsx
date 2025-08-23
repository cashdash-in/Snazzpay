
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle, AlertTriangle, User, Phone, Home, MapPin, BadgeCheck, ShieldCheck, CreditCard, Mail, Wallet, LogIn, Zap } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';
import { ScratchCard } from '@/components/scratch-card';

interface SecureCodFormProps {
    razorpayKeyId: string | null;
}

type Step = 'details' | 'scratch' | 'complete';
type PaymentStep = 'intent' | 'authorization';


function SnazzifyCoinCard({ customerName, orderId }: { customerName: string, orderId: string }) {
    return (
        <Link href="/customer/login" className="block w-full transition-transform duration-300 hover:scale-105">
            <div className="w-full max-w-sm rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-2xl space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-bold tracking-wider">Snazzify Trust Wallet</h3>
                        <p className="text-xs font-mono opacity-80">CUSTOMER WALLET</p>
                    </div>
                    <Wallet className="h-8 w-8 text-white/80" />
                </div>
                <div className="space-y-1 text-center">
                    <p className="text-sm font-mono opacity-80">Order ID</p>
                    <p className="text-lg font-mono tracking-widest">{orderId}</p>
                </div>
                <div className="space-y-1">
                     <p className="text-xs font-mono opacity-80">CARD HOLDER</p>
                    <p className="text-base font-medium uppercase tracking-wider">{customerName}</p>
                </div>
                <p className="text-center text-xs opacity-90 pt-2">Click here to log in and view your wallet</p>
            </div>
        </Link>
    );
}


export function SecureCodForm({ razorpayKeyId }: SecureCodFormProps) {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('details');
    const [paymentStep, setPaymentStep] = useState<PaymentStep>('intent');
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        baseAmount: 0,
        quantity: 1,
        orderId: ''
    });
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        contact: '',
        address: '',
        pincode: '',
        email: '',
    });
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [activeLead, setActiveLead] = useState<EditableOrder | null>(null);

    const action = searchParams.get('action');

    useEffect(() => {
        if (action === 'cancel') {
            setLoading(false);
            return;
        }
        setLoading(true);
        if (!razorpayKeyId) {
            setError('Razorpay Key ID is not configured on the server.');
        }

        const amountStr = searchParams.get('amount');
        const name = searchParams.get('name');
        const orderId = searchParams.get('order_id');
        
        let initialAmount = 1;
        let initialName = 'Sample Product';
        let initialOrderId = orderId || `manual_${uuidv4().substring(0,6)}`;

        if (amountStr && name) {
            const baseAmount = parseFloat(amountStr);
            if (!isNaN(baseAmount)) {
                initialAmount = baseAmount;
                initialName = name;
            } else {
                 setError('Invalid product price received.');
            }
        } else {
            initialAmount = 500;
            initialName = 'My Awesome Product';
        }

        setOrderDetails({
            productName: initialName,
            baseAmount: initialAmount,
            quantity: 1,
            orderId: initialOrderId
        });
        setLoading(false);
        
    }, [searchParams, razorpayKeyId, action]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value, 10);
        setOrderDetails(prev => ({
            ...prev,
            quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity
        }));
    };
    
    const handleCustomerDetailChange = (field: keyof typeof customerDetails, value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    const totalAmount = orderDetails.baseAmount * orderDetails.quantity;
    const paymentAmount = paymentStep === 'intent' ? 1 : totalAmount;

    const createOrderApi = async () => {
        const response = await fetch('/api/create-mandate-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: paymentAmount,
                productName: orderDetails.productName,
                customerName: customerDetails.name,
                customerEmail: customerDetails.email,
                customerContact: customerDetails.contact,
                customerAddress: customerDetails.address,
                customerPincode: customerDetails.pincode,
                isAuthorization: paymentStep === 'authorization',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create order.');
        }

        return response.json();
    };

    const openRazorpayCheckout = (order_id: string, handler: (response: any) => void) => {
        const options = {
            key: razorpayKeyId,
            order_id: order_id,
            name: paymentStep === 'intent' ? "Snazzify Intent Verification" : "Snazzify Trust Wallet",
            description: paymentStep === 'intent' ? `Pay ₹1.00 to verify your order` : `Pay ₹${totalAmount.toFixed(2)} - Held in Trust`,
            handler: handler,
            prefill: {
                name: customerDetails.name,
                email: customerDetails.email || `customer.${customerDetails.contact || uuidv4().substring(0,8)}@example.com`,
                contact: customerDetails.contact
            },
            notes: {
                "address": customerDetails.address,
                "product": orderDetails.productName,
                "original_order_id": orderDetails.orderId,
            },
            theme: { color: "#5a31f4" },
            modal: {
                ondismiss: function() {
                    setIsProcessing(false);
                    toast({
                        variant: 'destructive',
                        title: 'Payment Cancelled',
                        description: 'The payment process was cancelled.',
                    });
                }
            }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };
    
    const handlePayment = async () => {
        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must agree to the Terms and Conditions.' });
            return;
        }
        if (!customerDetails.name || !customerDetails.contact || !customerDetails.address || !customerDetails.pincode) {
            toast({ variant: 'destructive', title: 'Details Required', description: 'Please fill in all customer details before proceeding.' });
            return;
        }
        setIsProcessing(true);
        setError('');
        
        try {
            const { order_id } = await createOrderApi();

            const intentHandler = (response: any) => {
                const leadData: EditableOrder = {
                    id: uuidv4(),
                    orderId: orderDetails.orderId,
                    customerName: customerDetails.name,
                    customerEmail: customerDetails.email,
                    customerAddress: customerDetails.address,
                    pincode: customerDetails.pincode,
                    contactNo: customerDetails.contact,
                    productOrdered: orderDetails.productName,
                    quantity: orderDetails.quantity,
                    price: totalAmount.toFixed(2),
                    paymentStatus: 'Intent Verified',
                    date: format(new Date(), 'yyyy-MM-dd'),
                };
                setActiveLead(leadData);

                const existingLeads = JSON.parse(localStorage.getItem('leads') || '[]');
                localStorage.setItem('leads', JSON.stringify([...existingLeads, leadData]));

                toast({ title: 'Verification Successful!', description: 'Please proceed to secure your order.' });
                setPaymentStep('authorization');
                setStep('scratch');
                setIsProcessing(false);
            };

            const authorizationHandler = (response: any) => {
                 const paymentInfo = {
                    paymentId: response.razorpay_payment_id,
                    orderId: orderDetails.orderId,
                    razorpayOrderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                    status: 'authorized',
                    authorizedAt: new Date().toISOString()
                };
                localStorage.setItem(`payment_info_${orderDetails.orderId}`, JSON.stringify(paymentInfo));
                
                try {
                    const newOrder: EditableOrder = {
                        id: uuidv4(),
                        orderId: orderDetails.orderId,
                        customerName: customerDetails.name,
                        customerEmail: customerDetails.email,
                        customerAddress: customerDetails.address,
                        pincode: customerDetails.pincode,
                        contactNo: customerDetails.contact,
                        productOrdered: orderDetails.productName,
                        quantity: orderDetails.quantity,
                        price: totalAmount.toFixed(2),
                        paymentStatus: 'Authorized',
                        date: format(new Date(), 'yyyy-MM-dd'),
                    };
                    const existingOrdersJSON = localStorage.getItem('manualOrders');
                    const existingOrders: EditableOrder[] = existingOrdersJSON ? JSON.parse(existingOrdersJSON) : [];
                    localStorage.setItem('manualOrders', JSON.stringify([...existingOrders, newOrder]));

                    // Remove from leads
                    if (activeLead) {
                        const existingLeadsJSON = localStorage.getItem('leads');
                        if (existingLeadsJSON) {
                            const existingLeads: EditableOrder[] = JSON.parse(existingLeadsJSON);
                            const updatedLeads = existingLeads.filter(lead => lead.id !== activeLead.id);
                            localStorage.setItem('leads', JSON.stringify(updatedLeads));
                        }
                    }

                } catch(e) {
                    console.error("Failed to update local storage after authorization", e);
                }
                
                localStorage.setItem('loggedInUserMobile', customerDetails.contact);

                toast({ title: 'Payment Secured!', description: 'Your order is confirmed and will be shipped soon.' });
                setStep('complete');
                setIsProcessing(false);
            };

            const handler = paymentStep === 'intent' ? intentHandler : authorizationHandler;
            openRazorpayCheckout(order_id, handler);

        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsProcessing(false);
        }
    };

    const proceedToAuthorization = () => {
        setStep('details');
        handlePayment();
    }

    const renderScratchState = () => (
         <Card className="w-full max-w-md shadow-lg text-center bg-transparent border-0">
            <CardHeader className="pb-4">
                <BadgeCheck className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle>Verification Successful!</CardTitle>
                <CardDescription>Scratch below to reveal a special offer for your next purchase!</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
                 <ScratchCard
                    width={320}
                    height={180}
                    scratchImageSrc="https://placehold.co/320x180.png"
                    data-ai-hint="abstract pattern"
                >
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-300 to-orange-400 text-gray-800 p-4 rounded-lg">
                        <p className="text-lg font-bold">Congratulations!</p>
                        <p className="text-4xl font-black">10% OFF</p>
                        <p className="mt-2 text-xs">On your next order with code:</p>
                        <p className="font-mono text-lg bg-white/30 px-2 py-1 rounded">SNAZZY10</p>
                    </div>
                </ScratchCard>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={proceedToAuthorization} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Proceed to Pay ₹{totalAmount.toFixed(2)}
                </Button>
            </CardFooter>
        </Card>
    );

    const renderCompleteState = () => (
        <Card className="w-full max-w-md shadow-lg text-center bg-transparent border-0">
            <CardHeader className="pb-4">
                <BadgeCheck className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>Thank you! Your payment is secured in your Trust Wallet.</CardDescription>
            </CardHeader>
             <CardContent className="flex flex-col items-center justify-center space-y-4">
                <SnazzifyCoinCard customerName={customerDetails.name} orderId={orderDetails.orderId} />
            </CardContent>
        </Card>
    );
    
    if (action === 'cancel') {
        return null; // Don't render this form if we're in cancel mode
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    if (error && !isProcessing) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center"><AlertTriangle className="mx-auto h-10 w-10 text-destructive" /><CardTitle>Error Initializing</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">We couldn't set up the secure payment. Please see the error below:</p>
                        <div className="mt-4 bg-destructive/10 p-3 rounded-md text-center text-destructive text-sm font-mono break-words">{error}</div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (step === 'scratch') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderScratchState()}</div>;
    }
    if (step === 'complete') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderCompleteState()}</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <Zap className="mx-auto h-8 w-8 text-primary" />
                    <CardTitle>Modern, Secure Payment</CardTitle>
                    <CardDescription>{paymentStep === 'intent' ? 'First, verify your intent with a ₹1 payment.' : 'Pay now and your funds are held in a Trust Wallet until dispatch.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <Label>Customer Details</Label>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-name" placeholder="Full Name" value={customerDetails.name} onChange={(e) => handleCustomerDetailChange('name', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-email" placeholder="Email Address for Notifications" value={customerDetails.email} onChange={(e) => handleCustomerDetailChange('email', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-contact" placeholder="Contact Number for Notifications" value={customerDetails.contact} onChange={(e) => handleCustomerDetailChange('contact', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-address" placeholder="Street Address" value={customerDetails.address} onChange={(e) => handleCustomerDetailChange('address', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-pincode" placeholder="Pincode" value={customerDetails.pincode} onChange={(e) => handleCustomerDetailChange('pincode', e.target.value)} className="pl-9" /></div>
                    </div>
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center"><Label className="text-muted-foreground">Product:</Label><span className="font-medium text-right">{orderDetails.productName}</span></div>
                        <div className="flex justify-between items-center"><Label htmlFor="quantity" className="text-muted-foreground">Quantity:</Label><Input id="quantity" type="number" value={orderDetails.quantity} onChange={handleQuantityChange} className="w-20 text-center" min="1" /></div>
                        <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Amount:</span><span className="font-bold">₹{totalAmount.toFixed(2)}</span></div>
                    </div>
                    
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">I agree to the <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">Terms and Conditions</Link>.</Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={handlePayment} disabled={!agreed || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        {paymentStep === 'intent' ? 'Verify with ₹1.00' : `Pay ₹${totalAmount.toFixed(2)} Now`}
                    </Button>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                        <Link href="/customer/login" passHref>
                            <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><LogIn className="h-4 w-4" />Customer Login</span>
                        </Link>
                        <Link href="/faq" passHref>
                            <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How does this work?</span>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
