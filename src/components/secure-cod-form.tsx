
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle, AlertTriangle, User, Phone, Home, MapPin, BadgeCheck, ShieldCheck, CreditCard, Mail } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';
import { ScratchCard } from '@/components/scratch-card';

interface SecureCodFormProps {
    razorpayKeyId: string | null;
}

type Step = 'details' | 'authorize' | 'complete';

export function SecureCodForm({ razorpayKeyId }: SecureCodFormProps) {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('details');
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
    const [leadId, setLeadId] = useState<string | null>(null);

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

    const createOrderApi = async (isAuthorization: boolean) => {
        const response = await fetch('/api/create-mandate-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: isAuthorization ? totalAmount : 1,
                productName: orderDetails.productName,
                customerName: customerDetails.name,
                customerContact: customerDetails.contact,
                customerAddress: customerDetails.address,
                customerPincode: customerDetails.pincode,
                isAuthorization,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create order.');
        }

        return response.json();
    };

    const openRazorpayCheckout = (order_id: string, isAuthorization: boolean, handler: (response: any) => void) => {
        const options = {
            key: razorpayKeyId,
            order_id: order_id,
            name: "Snazzify Secure COD",
            description: isAuthorization 
                ? `Authorize ₹${totalAmount.toFixed(2)} for ${orderDetails.productName}`
                : `Verify Intent with ₹1.00`,
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
                        title: 'Process Cancelled',
                        description: 'The verification/authorization process was cancelled.',
                    });
                }
            }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const handleIntentVerification = async () => {
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

        const uniqueLeadId = uuidv4();
        setLeadId(uniqueLeadId); 

        const newLead: EditableOrder = {
            id: uniqueLeadId,
            orderId: orderDetails.orderId,
            customerName: customerDetails.name,
            customerEmail: customerDetails.email,
            customerAddress: customerDetails.address,
            pincode: customerDetails.pincode,
            contactNo: customerDetails.contact,
            productOrdered: orderDetails.productName,
            quantity: orderDetails.quantity,
            price: totalAmount.toFixed(2),
            paymentStatus: 'Intent Verified', // This is a lead status
            date: format(new Date(), 'yyyy-MM-dd'),
        };

        try {
            const existingLeadsJSON = localStorage.getItem('leads');
            const existingLeads: EditableOrder[] = existingLeadsJSON ? JSON.parse(existingLeadsJSON) : [];
            const updatedLeads = [...existingLeads, newLead];
            localStorage.setItem('leads', JSON.stringify(updatedLeads));
        } catch(e) {
            console.error("Failed to save lead to local storage", e);
            toast({ variant: 'destructive', title: 'Storage Error', description: 'Could not save lead details locally.' });
            setIsProcessing(false);
            return;
        }
        
        try {
            const { order_id } = await createOrderApi(false); // false for intent
            const handler = (response: any) => {
                toast({ title: 'Step 1 Complete!', description: 'Intent verified. Please complete the final authorization step.', variant: 'default' });
                setIsProcessing(false);
                setStep('authorize');
            };
            openRazorpayCheckout(order_id, false, handler);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsProcessing(false);
            
            const existingLeadsJSON = localStorage.getItem('leads');
            if (existingLeadsJSON) {
                let existingLeads: EditableOrder[] = JSON.parse(existingLeadsJSON);
                const filteredLeads = existingLeads.filter(l => l.id !== uniqueLeadId);
                localStorage.setItem('leads', JSON.stringify(filteredLeads));
            }
        }
    };
    
    const handleCardAuthorization = async () => {
        setIsProcessing(true);
        setError('');
        try {
            const { order_id } = await createOrderApi(true); // true for authorization
            const handler = (response: any) => {
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
                    // Remove from leads
                    const existingLeadsJSON = localStorage.getItem('leads');
                    if (existingLeadsJSON) {
                        let existingLeads: EditableOrder[] = JSON.parse(existingLeadsJSON);
                        const filteredLeads = existingLeads.filter(l => l.id !== leadId);
                        localStorage.setItem('leads', JSON.stringify(filteredLeads));
                    }
                    
                    // Add to manual orders
                    const newOrder: EditableOrder = {
                        id: leadId || uuidv4(),
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

                } catch(e) {
                    console.error("Failed to update local storage after authorization", e);
                }
                
                toast({ title: 'Authorization Successful!', description: 'Your order is confirmed and will be shipped soon.' });
                setStep('complete');
                setIsProcessing(false);
            };
            openRazorpayCheckout(order_id, true, handler);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsProcessing(false);
        }
    };

    const renderCompleteState = () => (
        <Card className="w-full max-w-md shadow-lg text-center">
            <CardHeader>
                <BadgeCheck className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle>Order Confirmed!</CardTitle>
                <CardDescription>Thank you! Your order is confirmed. Here is your Snazzify Coin.</CardDescription>
            </CardHeader>
             <CardContent className="flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground">Scratch the card to reveal your reward!</p>
                <ScratchCard
                    width={300}
                    height={180}
                    scratchImageSrc="https://placehold.co/300x180/8B5CF6/FFFFFF.png?text=Snazzify+Coin"
                    data-ai-hint="purple gold coin"
                >
                    <div className="flex flex-col items-center justify-center h-full text-center bg-gray-100 rounded-lg p-4">
                        <h3 className="text-lg font-bold text-primary">Your Reward!</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">Here's a link to your order invoice.</p>
                        <Link href={`/invoice/${leadId}`} passHref>
                           <Button>View My Invoice</Button>
                        </Link>
                    </div>
                </ScratchCard>
                <div className="text-center text-sm pt-4">
                    <p className="font-semibold">{customerDetails.name}</p>
                    <p className="text-muted-foreground">Order: {orderDetails.orderId}</p>
                </div>
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

    if (step === 'complete') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderCompleteState()}</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle>Confirm Your Secure COD Order</CardTitle>
                    <CardDescription>A two-step process to ensure your order is genuine and reserved.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <Label>Customer Details</Label>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-name" placeholder="Full Name" value={customerDetails.name} onChange={(e) => handleCustomerDetailChange('name', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-email" placeholder="Email Address" value={customerDetails.email} onChange={(e) => handleCustomerDetailChange('email', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-contact" placeholder="Contact Number" value={customerDetails.contact} onChange={(e) => handleCustomerDetailChange('contact', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-address" placeholder="Street Address" value={customerDetails.address} onChange={(e) => handleCustomerDetailChange('address', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-pincode" placeholder="Pincode" value={customerDetails.pincode} onChange={(e) => handleCustomerDetailChange('pincode', e.target.value)} className="pl-9" /></div>
                    </div>
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center"><Label className="text-muted-foreground">Product:</Label><span className="font-medium text-right">{orderDetails.productName}</span></div>
                        <div className="flex justify-between items-center"><Label htmlFor="quantity" className="text-muted-foreground">Quantity:</Label><Input id="quantity" type="number" value={orderDetails.quantity} onChange={handleQuantityChange} className="w-20 text-center" min="1" /></div>
                        <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Amount:</span><span className="font-bold">₹{totalAmount.toFixed(2)}</span></div>
                    </div>
                    
                    {step === 'details' && (
                        <div className="text-center space-y-3 p-3 bg-primary/5 rounded-lg">
                           <h3 className="font-semibold">Step 1: Verify Your Intent</h3>
                           <p className="text-xs text-muted-foreground">Please complete a ₹1.00 transaction to show your commitment. This helps us filter out fraudulent orders and reserves your item.</p>
                        </div>
                    )}
                    
                    {step === 'authorize' && (
                         <div className="text-center space-y-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                           <h3 className="font-semibold text-green-800">Final step! Authorize the full amount on your card.</h3>
                           <p className="text-xs text-muted-foreground">Your card will NOT be charged now. You will pay once you confirm dispatch. A minimum shipping charge only occurs if delivery is refused.</p>
                        </div>
                    )}
                    
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">I agree to the <Link href="/terms-and-conditions" target="_blank" className="underline text-primary">Terms and Conditions</Link>.</Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                     {step === 'details' && (
                        <Button className="w-full" onClick={handleIntentVerification} disabled={!agreed || isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Verify with ₹1.00
                        </Button>
                     )}
                     {step === 'authorize' && (
                         <Button className="w-full" onClick={handleCardAuthorization} disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            Authorize ₹{totalAmount.toFixed(2)} on Card
                        </Button>
                     )}
                    <Link href="/faq" passHref>
                        <span className="text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How does this work?</span>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
