'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Home, CreditCard, ShoppingCart } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/types/order';
import { saveDocument, getDocument, deleteDocument, getCollection } from '@/services/firestore';
import { format, addYears } from 'date-fns';
import { ShaktiCard, type ShaktiCardData } from '@/components/shakti-card';
import { sanitizePhoneNumber } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type CustomerDetails = {
    name: string;
    email: string;
    contact: string;
    address: string;
    pincode: string;
};

type DiscountRule = {
    id: string;
    type: 'collection' | 'vendor' | 'product';
    name: string;
    discount: number;
};

function SecureCodFormContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        amount: 0,
        orderId: '',
        sellerId: '',
        sellerName: '',
        productImage: '',
        productId: '',
        vendor: '',
        collection: '',
        allowedPaymentMethods: [] as string[],
    });
    
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
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'Secure Charge on Delivery' | 'Cash on Delivery' | 'Prepaid'>('Secure Charge on Delivery');
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);

    const [intentPaid, setIntentPaid] = useState(false);
    const [returnUrl, setReturnUrl] = useState('https://www.snazzify.co.in');

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
            return newCard;
        } catch(e) {
            console.error("Failed to save or find Shakti Card", e);
            return null;
        }
    };
    
    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/get-key');
                const { keyId } = await response.json();
                setRazorpayKeyId(keyId);

                const currentOrderId = searchParams.get('order_id');
                const backUrl = searchParams.get('return_url');
                if (backUrl) setReturnUrl(backUrl);

                if (currentOrderId) {
                    const lead = await getDocument<EditableOrder>('leads', currentOrderId);
                    if (lead) {
                        setOrderDetails({
                            productName: lead.productOrdered,
                            amount: parseFloat(lead.price),
                            orderId: lead.orderId,
                            sellerId: lead.sellerId || '',
                            sellerName: lead.sellerName || '',
                            productImage: lead.imageDataUris?.[0] || '',
                            productId: lead.productId || '',
                            vendor: lead.vendorName || '',
                            collection: lead.source || '',
                            allowedPaymentMethods: (lead as any).allowedPaymentMethods || ['Secure COD', 'Cash on Delivery', 'Prepaid'],
                        });
                        setCustomerDetails({
                            name: lead.customerName,
                            email: lead.customerEmail || '',
                            contact: lead.contactNo,
                            address: lead.customerAddress,
                            pincode: lead.pincode
                        });
                        if (lead.paymentStatus === 'Intent Verified') setIntentPaid(true);
                    }
                } else {
                    setOrderDetails({
                        productName: searchParams.get('name') || 'Product',
                        amount: parseFloat(searchParams.get('amount') || '0'),
                        orderId: searchParams.get('order_id') || `SNZ-${uuidv4().substring(0, 4)}`.toUpperCase(),
                        sellerId: searchParams.get('sellerId') || '',
                        sellerName: searchParams.get('sellerName') || '',
                        productImage: searchParams.get('image') || '',
                        productId: searchParams.get('productId') || '',
                        vendor: searchParams.get('vendor') || '',
                        collection: searchParams.get('collection') || '',
                        allowedPaymentMethods: ['Secure COD', 'Cash on Delivery', 'Prepaid'],
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [searchParams]);

    useEffect(() => {
        async function calculatePrice() {
            const baseTotal = orderDetails.amount * quantity;
            try {
                const discounts = await getCollection<DiscountRule>('discounts');
                const bestDiscount = discounts.find(d => 
                    d.id === `product_${orderDetails.productId}` || 
                    d.id === `vendor_${orderDetails.vendor}` || 
                    d.id === `collection_${orderDetails.collection}`
                ) || null;
                
                setAppliedDiscount(bestDiscount);
                
                if (paymentMethod === 'Secure Charge on Delivery' && bestDiscount) {
                    setTotalPrice(baseTotal - (baseTotal * (bestDiscount.discount / 100)));
                } else {
                    setTotalPrice(baseTotal);
                }
            } catch (error) {
                setTotalPrice(baseTotal);
            }
        }
        if (orderDetails.amount > 0) calculatePrice();
    }, [quantity, orderDetails, paymentMethod]);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const { name, email, contact, address, pincode } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please fill out your delivery details first." });
            return;
        }

        setIsSubmitting(true);

        const orderData: Omit<EditableOrder, 'id' | 'paymentStatus' | 'source'> = {
            orderId: orderDetails.orderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode,
            productOrdered: orderDetails.productName, quantity, price: totalPrice.toString(), date: new Date().toISOString(),
            sellerId: orderDetails.sellerId, sellerName: orderDetails.sellerName, paymentMethod,
            size: selectedSize, color: selectedColor, imageDataUris: orderDetails.productImage ? [orderDetails.productImage] : [],
        };
        
        if (paymentMethod === 'Cash on Delivery') {
            try {
                const newOrder: EditableOrder = { ...orderData, id: uuidv4(), paymentStatus: 'Pending', source: 'Manual', isRead: false };
                await saveDocument('orders', newOrder, newOrder.id);
                setStep('complete');
            } catch (err) {
                toast({ variant: 'destructive', title: "Order Failed" });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (paymentMethod === 'Prepaid') {
            try {
                const prepaidRes = await fetch('/api/create-mandate-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: totalPrice, productName: orderDetails.productName, isAuthorization: false, name, email, contact, address, pincode })
                });
                const prepaidResult = await prepaidRes.json();

                if (prepaidResult.error) throw new Error(prepaidResult.error);

                const rzp = new (window as any).Razorpay({
                    key: razorpayKeyId, amount: totalPrice * 100, currency: "INR", name: "Prepaid Order", description: orderDetails.productName, order_id: prepaidResult.order_id,
                    handler: async (response: any) => {
                        const finalOrder: EditableOrder = { ...orderData, id: prepaidResult.internal_order_id, paymentStatus: 'Paid', source: 'Manual', isRead: false };
                        await saveDocument('orders', finalOrder, finalOrder.id);
                        const card = await getOrCreateShaktiCard(finalOrder);
                        if (card) setNewlyCreatedCard(card);
                        setStep('complete');
                    },
                    modal: { ondismiss: () => setIsSubmitting(false) },
                    prefill: { name, email, contact }, theme: { color: "#5a31f4" }
                });
                rzp.open();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Payment Error', description: error.message });
                setIsSubmitting(false);
            }
            return;
        }

        // Secure COD Logic
        try {
            if (!intentPaid) {
                const intentRes = await fetch('/api/create-mandate-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 1, productName: `Verify ${orderDetails.productName}`, isAuthorization: false, name, email, contact, address, pincode })
                });
                const intentResult = await intentRes.json();
                
                if (intentResult.error) throw new Error(intentResult.error);

                const rzp = new (window as any).Razorpay({
                    key: razorpayKeyId, order_id: intentResult.order_id, amount: 100, name: "Order Verification", description: "Intent Verification (₹1)",
                    handler: async () => {
                        await saveDocument('leads', { ...orderData, id: intentResult.internal_order_id, paymentStatus: 'Intent Verified' }, intentResult.internal_order_id);
                        setIntentPaid(true);
                        setIsSubmitting(false);
                        toast({ title: "Verification Successful!", description: "Now complete the final authorization to secure your order." });
                    },
                    modal: { ondismiss: () => setIsSubmitting(false) },
                    prefill: { name, email, contact }, theme: { color: "#5a31f4" }
                });
                rzp.open();
            } else {
                const authRes = await fetch('/api/create-mandate-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: totalPrice, productName: orderDetails.productName, isAuthorization: true, name, email, contact, address, pincode })
                });
                const authResult = await authRes.json();
                
                if (authResult.error) throw new Error(authResult.error);

                const rzp2 = new (window as any).Razorpay({
                    key: razorpayKeyId, order_id: authResult.order_id, amount: totalPrice * 100, name: "Authorize Payment", description: `Authorizing ₹${totalPrice.toFixed(2)} in Trust Wallet`,
                    handler: async (response: any) => {
                        const finalId = authResult.internal_order_id;
                        await saveDocument('payment_info', { paymentId: response.razorpay_payment_id, orderId: finalId, status: 'authorized', authorizedAt: new Date().toISOString() }, finalId);
                        const finalOrder: EditableOrder = { ...orderData, id: finalId, paymentStatus: 'Authorized', source: 'Manual', isRead: false };
                        await saveDocument('orders', finalOrder, finalId);
                        const card = await getOrCreateShaktiCard(finalOrder);
                        if (card) setNewlyCreatedCard(card);
                        setStep('complete');
                    },
                    modal: { ondismiss: () => setIsSubmitting(false) },
                    prefill: { name, email, contact }, theme: { color: "#5a31f4" }
                });
                rzp2.open();
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Secure COD Error', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center rounded-[32px] border-none p-8">
                    <CardHeader>
                         <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-12 w-12" />
                         </div>
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Order Confirmed!</CardTitle>
                        <CardDescription>Thank you! Your purchase has been secured.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground text-sm">The seller has been notified and will process your order soon.</p>
                        {newlyCreatedCard && (
                            <div className="pt-6 border-t">
                                <h4 className="font-bold uppercase text-[10px] text-slate-400 tracking-widest mb-4">Your Shakti Card is Ready!</h4>
                                <div className="flex justify-center"><ShaktiCard card={newlyCreatedCard} /></div>
                            </div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-3 pt-8">
                        <Link href="/customer/login" className="w-full"><Button className="w-full h-12 font-bold rounded-xl">Go to Customer Portal</Button></Link>
                         <Button className="w-full h-12 font-bold rounded-xl" variant="outline" onClick={() => window.location.href = returnUrl}>Return to Store</Button>
                    </CardFooter>
                 </Card>
            </div>
        );
    }

    const isAllowed = (method: string) => orderDetails.allowedPaymentMethods.length === 0 || orderDetails.allowedPaymentMethods.includes(method);

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-lg shadow-2xl rounded-[32px] border-none overflow-hidden">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center bg-slate-50 p-8 border-b">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="text-2xl font-black italic uppercase tracking-tighter mt-2">Secure Checkout</CardTitle>
                        <CardDescription className="font-mono text-xs uppercase tracking-widest">Order Ref: {orderDetails.orderId}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        {/* Delivery Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Delivery Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase ml-1">Full Name</Label><Input required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase ml-1">Mobile Number</Label><Input type="tel" required value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" /></div>
                                <div className="space-y-1.5 sm:col-span-2"><Label className="text-[10px] font-bold uppercase ml-1">Shipping Address</Label><Input required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase ml-1">Pincode</Label><Input required value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="h-11 rounded-xl bg-slate-50 border-none font-medium" /></div>
                            </div>
                        </div>

                        {/* Payment Selection Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Select Payment Method</h3>
                            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="grid grid-cols-1 gap-3">
                                {isAllowed('Secure COD') && (
                                    <Label htmlFor="r-scod" className={cn(
                                        "flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200", 
                                        paymentMethod === 'Secure Charge on Delivery' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'
                                    )}>
                                        <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="shrink-0" />
                                        <div className="flex-1 space-y-0.5">
                                            <p className="font-black italic uppercase text-sm flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-primary" /> Secure COD
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium">Funds held in Trust Wallet. Release only on dispatch.</p>
                                        </div>
                                    </Label>
                                )}
                                
                                {isAllowed('Prepaid') && (
                                    <Label htmlFor="r-pre" className={cn(
                                        "flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200", 
                                        paymentMethod === 'Prepaid' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'
                                    )}>
                                        <RadioGroupItem value="Prepaid" id="r-pre" className="shrink-0" />
                                        <div className="flex-1 space-y-0.5">
                                            <p className="font-black italic uppercase text-sm flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-primary" /> Online Payment
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium">Pay full amount now for fastest processing.</p>
                                        </div>
                                    </Label>
                                )}

                                {isAllowed('Cash on Delivery') && (
                                    <Label htmlFor="r-cod" className={cn(
                                        "flex items-center gap-4 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200", 
                                        paymentMethod === 'Cash on Delivery' ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200'
                                    )}>
                                        <RadioGroupItem value="Cash on Delivery" id="r-cod" className="shrink-0" />
                                        <div className="flex-1 space-y-0.5">
                                            <p className="font-black italic uppercase text-sm flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-primary" /> Standard COD
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium">Pay cash at your doorstep.</p>
                                        </div>
                                    </Label>
                                )}
                            </RadioGroup>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-6 p-8 pt-0">
                        <Button type="submit" className="w-full h-16 text-lg font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 transition-transform active:scale-95" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            ) : (
                                paymentMethod === 'Secure Charge on Delivery' 
                                    ? (intentPaid ? `Authorize Final: ₹${totalPrice.toFixed(2)}` : 'Proceed to Verify (₹1)') 
                                    : (paymentMethod === 'Cash on Delivery' ? 'Confirm Order' : `Pay ₹${totalPrice.toFixed(2)} Now`)
                            )}
                        </Button>
                        
                        <div className="flex items-center justify-center gap-8 w-full">
                            <Link href="/customer/login" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                Customer Login
                            </Link>
                            <Link href="/faq" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline inline-flex items-center gap-1.5">
                                <HelpCircle className="h-3.5 w-3.5" /> How this works
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export function SecureCodPaymentForm() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SecureCodFormContent />
        </Suspense>
    );
}