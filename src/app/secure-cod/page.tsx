
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, HelpCircle, User, Phone, Home, MapPin, Mail, Package, CheckCircle, ShoppingBag } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';
import { CancellationForm } from '@/components/cancellation-form';
import { usePageRefresh } from '@/hooks/usePageRefresh';


type PaymentMethod = 'Secure COD' | 'Prepaid' | 'Cash on Delivery';

function SecureCodOrderForm() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { triggerRefresh } = usePageRefresh();

    const [orderDetails, setOrderDetails] = useState<{productName: string; amount: number; orderId: string}>({
        productName: 'Loading...',
        amount: 0,
        orderId: ''
    });
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        email: '',
        contact: '',
        altContact: '',
        address: '',
        landmark: '',
        pincode: '',
    });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Secure COD');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'form' | 'complete'>('form');

    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 8)}`;

        setOrderDetails({ productName: name, amount, orderId });
        setLoading(false);
    }, [searchParams]);

    const handleDetailChange = (field: keyof typeof customerDetails, value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmitOrder = () => {
        if (!customerDetails.name || !customerDetails.address || !customerDetails.pincode || !customerDetails.contact) {
            toast({
                variant: 'destructive',
                title: 'Missing Details',
                description: 'Please fill in your name, address, pincode, and contact number.'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const newLead: EditableOrder = {
                id: uuidv4(),
                orderId: orderDetails.orderId,
                customerName: customerDetails.name,
                customerEmail: customerDetails.email,
                customerAddress: `${customerDetails.address}, Landmark: ${customerDetails.landmark}`,
                pincode: customerDetails.pincode,
                contactNo: customerDetails.contact,
                productOrdered: orderDetails.productName,
                quantity: 1,
                price: orderDetails.amount.toFixed(2),
                paymentStatus: 'Pending', // All orders start as pending
                date: format(new Date(), 'yyyy-MM-dd'),
                source: 'Manual' // Or some other source identifier
            };

            // In a real app, this would be an API call. For the prototype, we use localStorage.
            const existingLeads = JSON.parse(localStorage.getItem('leads') || '[]');
            localStorage.setItem('leads', JSON.stringify([newLead, ...existingLeads]));

            toast({
                title: 'Order Placed!',
                description: 'Thank you! The seller will contact you shortly to confirm and process your payment.',
            });
            
            triggerRefresh(); // Notify other parts of the app that data has changed
            setStep('complete');

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error.message || 'An unknown error occurred.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
         return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You for Your Order!</CardTitle>
                        <CardDescription>Your order request for "{orderDetails.productName}" has been sent to the seller.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">The seller will review your details and send you a payment link shortly via WhatsApp or Email to complete your purchase. Please check your messages!</p>
                    </CardContent>
                    <CardFooter>
                        <Link href="/" className="w-full">
                            <Button className="w-full">Continue Shopping</Button>
                        </Link>
                    </CardFooter>
                 </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader className="text-center">
                    <ShoppingBag className="mx-auto h-8 w-8 text-primary" />
                    <CardTitle>Final Step: Confirm Your Order</CardTitle>
                    <CardDescription>Please provide your delivery details below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="border rounded-lg p-4 space-y-2">
                         <div className="flex justify-between items-center"><span className="text-muted-foreground">Product:</span><span className="font-bold text-right">{orderDetails.productName}</span></div>
                         <div className="flex justify-between items-center text-xl"><span className="text-muted-foreground">Total:</span><span className="font-bold">₹{orderDetails.amount.toFixed(2)}</span></div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold">Your Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" value={customerDetails.name} onChange={e => handleDetailChange('name', e.target.value)} required/></div>
                            <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={customerDetails.email} onChange={e => handleDetailChange('email', e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="contact">Mobile Number</Label><Input id="contact" value={customerDetails.contact} onChange={e => handleDetailChange('contact', e.target.value)} required/></div>
                            <div className="space-y-2"><Label htmlFor="altContact">Alternate Mobile (Optional)</Label><Input id="altContact" value={customerDetails.altContact} onChange={e => handleDetailChange('altContact', e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="address">Full Delivery Address</Label><Input id="address" value={customerDetails.address} onChange={e => handleDetailChange('address', e.target.value)} required /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="landmark">Landmark (Optional)</Label><Input id="landmark" value={customerDetails.landmark} onChange={e => handleDetailChange('landmark', e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="pincode">Pincode</Label><Input id="pincode" value={customerDetails.pincode} onChange={e => handleDetailChange('pincode', e.target.value)} required/></div>
                        </div>
                    </div>
                     <div className="space-y-3">
                        <Label>Select Payment Method</Label>
                        <RadioGroup defaultValue="Secure COD" value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)} className="grid grid-cols-3 gap-4">
                            <div><Card className={`p-4 cursor-pointer text-center ${paymentMethod === 'Secure COD' ? 'border-primary ring-2 ring-primary' : ''}`} onClick={() => setPaymentMethod('Secure COD')}><RadioGroupItem value="Secure COD" id="r1" className="sr-only" /><Label htmlFor="r1" className="font-semibold cursor-pointer">Secure COD</Label><p className="text-xs text-muted-foreground">Pay now, funds held in trust</p></Card></div>
                            <div><Card className={`p-4 cursor-pointer text-center ${paymentMethod === 'Prepaid' ? 'border-primary ring-2 ring-primary' : ''}`} onClick={() => setPaymentMethod('Prepaid')}><RadioGroupItem value="Prepaid" id="r2" className="sr-only" /><Label htmlFor="r2" className="font-semibold cursor-pointer">Prepaid</Label><p className="text-xs text-muted-foreground">Standard online payment</p></Card></div>
                            <div><Card className={`p-4 cursor-pointer text-center ${paymentMethod === 'Cash on Delivery' ? 'border-primary ring-2 ring-primary' : ''}`} onClick={() => setPaymentMethod('Cash on Delivery')}><RadioGroupItem value="Cash on Delivery" id="r3" className="sr-only" /><Label htmlFor="r3" className="font-semibold cursor-pointer">Cash on Delivery</Label><p className="text-xs text-muted-foreground">Pay cash at your door</p></Card></div>
                        </RadioGroup>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button className="w-full" onClick={handleSubmitOrder} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                        Place Order
                    </Button>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                        <Link href="/customer/login" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1">Customer Login</span></Link>
                        <Link href="/faq" passHref><span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How does this work?</span></Link>
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
                <SecureCodOrderForm />
            </Suspense>
            <Suspense>
                 <CancellationForm />
            </Suspense>
        </div>
    );
}

export default Page;
