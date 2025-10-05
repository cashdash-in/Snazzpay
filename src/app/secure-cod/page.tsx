
'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, ShoppingCart, ArrowRight } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

type CustomerDetails = {
    name: string;
    email: string;
    contact: string;
    address: string;
    pincode: string;
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
    
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        amount: 0,
        orderId: '',
        sellerId: '',
        sellerName: '',
        productImage: ''
    });
    
    const [availableSizes, setAvailableSizes] = useState<string[]>([]);
    const [availableColors, setAvailableColors] = useState<string[]>([]);

    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');

    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'complete'>('details');
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [isAmountConfirmed, setIsAmountConfirmed] = useState(false);

    const getOrCreateShaktiCard = async (order: EditableOrder): Promise<ShaktiCardData | null> => {
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
                points: 100, cashback: 0, sellerId: order.sellerId || 'snazzify', sellerName: order.sellerName || 'Snazzify',
            };
            await saveDocument('shakti_cards', newCard, newCard.cardNumber);
            toast({ title: "Shakti Card Issued!", description: "You've earned a Shakti Card for future benefits!" });
            return newCard;
        } catch(e) {
            console.error("Failed to save or find Shakti Card", e);
            return null;
        }
    };
    
    useEffect(() => {
        const name = searchParams.get('name') || 'Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const id = searchParams.get('order_id') || `LEGACY-${uuidv4().substring(0, 4)}`.toUpperCase();
        const sellerId = searchParams.get('sellerId') || '';
        const sellerName = searchParams.get('sellerName') || '';
        const image = searchParams.get('image') || '';
        const sizes = searchParams.get('sizes')?.split(',').filter(s => s) || [];
        const colors = searchParams.get('colors')?.split(',').filter(c => c) || [];
        
        setAvailableSizes(sizes);
        setAvailableColors(colors);

        setOrderDetails({ productName: name, amount, orderId: id, sellerId, sellerName, productImage: image });
        if (sizes.length > 0) setSelectedSize(sizes[0]);
        if (colors.length > 0) setSelectedColor(colors[0]);
        
        setCustomerDetails({
            name: searchParams.get('customerName') || '',
            email: searchParams.get('customerEmail') || '',
            contact: searchParams.get('customerContact') || '',
            address: searchParams.get('customerAddress') || '',
            pincode: searchParams.get('customerPincode') || '',
        });
        
        getRazorpayKeyId().then(key => { setLoading(false); setRazorpayKeyId(key); });
    }, [searchParams]);

    useEffect(() => {
        const newTotal = orderDetails.amount * quantity;
        setTotalPrice(newTotal);
    }, [quantity, orderDetails.amount]);

    const handleConfirmAmount = () => {
        setIsAmountConfirmed(true);
        toast({ title: "Amount Confirmed", description: `Total amount is set to ₹${totalPrice.toFixed(2)}` });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const { name, email, contact, address, pincode } = customerDetails;
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            return;
        }
        if (totalPrice <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Order total must be greater than zero." });
            return;
        }

        setIsSubmitting(true);

        const orderData: Omit<EditableOrder, 'id' | 'paymentStatus' | 'source'> = {
            orderId: orderDetails.orderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode,
            productOrdered: orderDetails.productName, quantity: quantity, price: totalPrice.toString(), date: new Date().toISOString(),
            sellerId: orderDetails.sellerId, sellerName: orderDetails.sellerName, paymentMethod, size: selectedSize, color: selectedColor,
        };
        
        if (!razorpayKeyId) {
            toast({ variant: 'destructive', title: "Razorpay Not Configured" });
            setIsSubmitting(false);
            return;
        }

        try {
            const handleRazorpaySuccess = async (authResponse: any, orderId: string) => {
                const finalOrder: EditableOrder = { ...orderData, id: orderId, paymentStatus: 'Authorized', source: 'Shopify' };
                
                await saveDocument('payment_info', {
                    paymentId: authResponse.razorpay_payment_id,
                    orderId: orderId,
                    razorpayOrderId: authResponse.razorpay_order_id,
                    signature: authResponse.razorpay_signature,
                    status: 'authorized',
                    authorizedAt: new Date().toISOString()
                }, orderId);

                await saveDocument('orders', finalOrder, orderId);
                
                const leadDoc = await getDocument('leads', orderId);
                if (leadDoc) await deleteDocument('leads', orderId);
                
                const card = await getOrCreateShaktiCard(finalOrder);
                if (card) setNewlyCreatedCard(card);
                
                toast({ title: "Authorization Successful!", description: `Order ${finalOrder.orderId} is confirmed.` });
                setStep('complete');
            };

            const intentResponse = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1, productName: `Verification for ${orderDetails.productName}`, isAuthorization: false, name, email, contact, address, pincode })
            });
            const intentResult = await intentResponse.json();
            if (intentResult.error) throw new Error(`Intent Verification Failed: ${intentResult.error}`);
            
            const internalOrderId = intentResult.internal_order_id;
            
            const intentRzpPromise = new Promise<void>((resolve, reject) => {
                const intentOptions = {
                    key: razorpayKeyId,
                    order_id: intentResult.order_id,
                    amount: 100,
                    name: "Verify Your Order",
                    description: "A ₹1 charge to confirm your payment method.",
                    handler: async () => {
                         await saveDocument('leads', { ...orderData, id: internalOrderId, paymentStatus: 'Intent Verified', source: 'Shopify' }, internalOrderId);
                         resolve();
                    },
                    modal: { ondismiss: () => reject(new Error('Verification payment was closed.')) },
                    prefill: { name, email, contact },
                    theme: { color: "#663399" }
                };
                const rzp1 = new (window as any).Razorpay(intentOptions);
                rzp1.open();
            });

            await intentRzpPromise;
            toast({ title: 'Verification Successful!', description: 'Now proceeding to final authorization.' });

            const authResponse = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalPrice, productName: orderDetails.productName, isAuthorization: true, name, email, contact, address, pincode })
            });
            const authResult = await authResponse.json();
            if (authResult.error) throw new Error(`Authorization Failed: ${authResult.error}`);
            
            const rzp2 = new (window as any).Razorpay({
                key: razorpayKeyId,
                order_id: authResult.order_id,
                amount: totalPrice * 100,
                name: "Authorize Secure COD Payment",
                description: `Securely authorize ₹${totalPrice.toFixed(2)} for your order`,
                handler: (response: any) => handleRazorpaySuccess(response, authResult.internal_order_id),
                modal: { ondismiss: () => setIsSubmitting(false) },
                prefill: { name, email, contact },
                theme: { color: "#663399" }
            });
            rzp2.open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        const successMessage = "Your payment has been authorized! Your order is confirmed.";
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>Payment Authorized!</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{successMessage}</p>
                        {newlyCreatedCard && (
                            <div className="pt-4 border-t"><h4 className="font-semibold mb-2">Your Shakti COD Card is Ready!</h4><div className="flex justify-center"><ShaktiCard card={newlyCreatedCard} /></div></div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Link href="/customer/login" className="w-full"><Button className="w-full">Go to Customer Portal</Button></Link>
                         <a href="https://www.snazzify.co.in" className="w-full"><Button className="w-full" variant="outline">Continue Shopping</Button></a>
                    </CardFooter>
                 </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>Secure Your Order</CardTitle>
                        <CardDescription>Confirm details for order {orderDetails.orderId}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/30">
                             <CardHeader className="p-4">
                                 <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                {orderDetails.productImage && (
                                    <div className="my-4 flex justify-center">
                                        <Image
                                            src={orderDetails.productImage}
                                            alt={orderDetails.productName}
                                            width={150}
                                            height={150}
                                            className="rounded-lg object-contain bg-white"
                                        />
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Product:</span>
                                    <span className="font-medium text-right">{orderDetails.productName}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Price per item:</span>
                                    <span>₹{orderDetails.amount.toFixed(2)}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                    <div className="space-y-1 col-span-1">
                                        <Label htmlFor='quantity' className="text-xs text-muted-foreground">Quantity:</Label>
                                        <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="h-8" min={1}/>
                                    </div>
                                     <div className="grid grid-cols-2 col-span-2 gap-2">
                                        {availableSizes.length > 0 && (
                                            <div className="space-y-1">
                                                <Label htmlFor="size" className="text-xs text-muted-foreground">Size</Label>
                                                <Select onValueChange={setSelectedSize} value={selectedSize}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{availableSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                                            </div>
                                        )}
                                        {availableColors.length > 0 && (
                                            <div className="space-y-1">
                                                <Label htmlFor="color" className="text-xs text-muted-foreground">Color</Label>
                                                <Select onValueChange={setSelectedColor} value={selectedColor}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                                            </div>
                                        )}
                                     </div>
                                </div>
                                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t"><span className="text-muted-foreground">Total Order Amount:</span><span>₹{totalPrice.toFixed(2)}</span></div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="font-semibold">Your Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="name" required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="pl-9" /></div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact">Contact Number</Label>
                                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="contact" type="tel" required value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="pl-9" /></div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" required value={customerDetails.email} onChange={e => setCustomerDetails({...customerDetails, email: e.target.value})} className="pl-9" /></div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="address">Full Delivery Address</Label>
                                    <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="address" required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="pl-9" /></div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pincode">Pincode</Label>
                                    <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="pincode" required value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="pl-9" /></div>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                         <div className="w-full flex flex-col gap-2">
                            <Button type="button" variant="outline" className="w-full" onClick={handleConfirmAmount}>
                                Confirm Amount
                            </Button>
                             <Button type="submit" className="w-full" disabled={isSubmitting || loading || !isAmountConfirmed}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Proceed to Secure Payment
                            </Button>
                         </div>
                        <p className="text-xs text-muted-foreground text-center">Your card will be authorized for the total amount. Funds are only captured upon dispatch.</p>
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
    // This component will only render on the client side
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

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
