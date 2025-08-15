
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle, AlertTriangle, User, Phone, Home, MapPin } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';


interface SecureCodFormProps {
    razorpayKeyId: string | null;
}

export function SecureCodForm({ razorpayKeyId }: SecureCodFormProps) {
    const searchParams = useSearchParams();
    const { toast } = useToast();
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
    });
    const [loading, setLoading] = useState(true);
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        setLoading(true);
        if (!razorpayKeyId) {
            setError('Razorpay Key ID is not configured on the server.');
        }

        const amountStr = searchParams.get('amount');
        const name = searchParams.get('name');
        const orderId = searchParams.get('order_id');
        
        let initialAmount = 1;
        let initialName = 'Sample Product';
        let initialOrderId = orderId || `manual_${uuidv4()}`;

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

        const currentOrderDetails = {
            productName: initialName,
            baseAmount: initialAmount,
            quantity: 1,
            orderId: initialOrderId
        };

        setOrderDetails(currentOrderDetails);
        setLoading(false);
        
    }, [searchParams, razorpayKeyId]);

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
    
     const handleCustomerDetailChange = (field: keyof typeof customerDetails, value: string) => {
        setCustomerDetails(prev => ({ ...prev, [field]: value }));
    };

    const totalAmount = orderDetails.baseAmount * orderDetails.quantity;

    const handleAuthorization = async () => {
        if (!agreed) {
            toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must agree to the Terms and Conditions to proceed.' });
            return;
        }
        if (!razorpayKeyId) {
            setError('Razorpay Key ID is not configured on the server.');
            toast({ variant: 'destructive', title: 'Configuration Error', description: 'Razorpay Key ID is not configured.' });
            return;
        }
        if (!(window as any).Razorpay) {
            toast({ variant: 'destructive', title: 'SDK Error', description: 'Razorpay Checkout SDK failed to load.' });
            return;
        }
        
        setIsAuthorizing(true);
        setError('');

        try {
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: totalAmount,
                    productName: orderDetails.productName,
                    customerName: customerDetails.name,
                    customerContact: customerDetails.contact,
                    customerAddress: customerDetails.address,
                    customerPincode: customerDetails.pincode,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create mandate order.');
            }

            const { order_id } = await response.json();

            const options = {
                key: razorpayKeyId,
                order_id: order_id,
                name: "Snazzify Secure COD",
                description: `Authorize eMandate for ${orderDetails.productName}`,
                handler: function (response: any){
                    toast({
                        title: 'Authorization Successful!',
                        description: `Mandate successfully authorized. Payment ID: ${response.razorpay_payment_id}`,
                        variant: 'default'
                    });
                    
                    const paymentInfo = {
                        paymentId: response.razorpay_payment_id,
                        orderId: orderDetails.orderId,
                        razorpayOrderId: response.razorpay_order_id,
                        signature: response.razorpay_signature,
                        status: 'authorized',
                        authorizedAt: new Date().toISOString()
                    };
                    
                    localStorage.setItem(`payment_info_${orderDetails.orderId}`, JSON.stringify(paymentInfo));

                    // Create a new order in the app
                    const newOrder: EditableOrder = {
                        id: uuidv4(), // Give it a new unique internal ID
                        orderId: orderDetails.orderId,
                        customerName: customerDetails.name,
                        customerAddress: customerDetails.address,
                        pincode: customerDetails.pincode,
                        contactNo: customerDetails.contact,
                        productOrdered: orderDetails.productName,
                        quantity: orderDetails.quantity,
                        price: totalAmount.toFixed(2),
                        paymentStatus: 'Authorized', // Set status to Authorized
                        date: format(new Date(), 'yyyy-MM-dd'),
                    };

                    const existingOrders = JSON.parse(localStorage.getItem('manualOrders') || '[]');
                    const updatedOrders = [...existingOrders, newOrder];
                    localStorage.setItem('manualOrders', JSON.stringify(updatedOrders));
                    
                    setIsAuthorizing(false);

                    // Optionally, redirect to a success page or the orders page
                    // window.location.href = '/orders';
                },
                prefill: {
                    name: customerDetails.name,
                    email: `customer.${customerDetails.contact || uuidv4().substring(0,8)}@example.com`,
                    contact: customerDetails.contact
                },
                notes: {
                    "address": customerDetails.address,
                    "product": orderDetails.productName,
                    "original_order_id": orderDetails.orderId,
                },
                theme: {
                    color: "#5a31f4"
                },
                modal: {
                    ondismiss: function() {
                        setIsAuthorizing(false);
                         toast({
                            variant: 'destructive',
                            title: 'Authorization Cancelled',
                            description: 'The authorization process was cancelled.',
                        });
                    }
                }
            };
            
            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (e: any) {
            console.error("eMandate Error:", e);
            setError(e.message);
            toast({ variant: 'destructive', title: 'Authorization Error', description: e.message });
            setIsAuthorizing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error && !isAuthorizing) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center">
                        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
                        <CardTitle>Error Initializing Payment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-center text-muted-foreground">We couldn't set up the secure payment link. Please see the error below:</p>
                        <div className="mt-4 bg-destructive/10 p-3 rounded-md text-center text-destructive text-sm font-mono break-words">
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
                        <CardTitle>Confirm Your Order</CardTitle>
                        <CardDescription>Confirm your order by authorizing the payment and show your intent by paying only Rs 1.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-3">
                            <Label>Customer Details</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="customer-name" placeholder="Full Name" value={customerDetails.name} onChange={(e) => handleCustomerDetailChange('name', e.target.value)} className="pl-9" />
                            </div>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="customer-contact" placeholder="Contact Number" value={customerDetails.contact} onChange={(e) => handleCustomerDetailChange('contact', e.target.value)} className="pl-9" />
                            </div>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="customer-address" placeholder="Street Address" value={customerDetails.address} onChange={(e) => handleCustomerDetailChange('address', e.target.value)} className="pl-9" />
                            </div>
                             <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="customer-pincode" placeholder="Pincode" value={customerDetails.pincode} onChange={(e) => handleCustomerDetailChange('pincode', e.target.value)} className="pl-9" />
                            </div>
                        </div>

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
                            <div className="flex justify-between items-center text-lg border-t pt-3 mt-3">
                                <span className="text-primary">Authorization Fee:</span>
                                <span className="font-bold text-primary">₹1.00</span>
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
                           By clicking the button below, you authorize an auto-debit of ₹300.00 from your account upon confirmation at the time of delivery
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleAuthorization} disabled={!agreed || isAuthorizing}>
                            {isAuthorizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Authorize with Razorpay
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}

    