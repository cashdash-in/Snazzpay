'use client';

import { useEffect, useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, Percent } from "lucide-react";
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
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

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
    const [paymentMethod, setPaymentMethod] = useState<'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [originalPrice, setOriginalPrice] = useState(0);
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
                        orderId: searchParams.get('order_id') || `LEGACY-${uuidv4().substring(0, 4)}`.toUpperCase(),
                        sellerId: searchParams.get('sellerId') || '',
                        sellerName: searchParams.get('sellerName') || '',
                        productImage: searchParams.get('image') || '',
                        productId: searchParams.get('productId') || '',
                        vendor: searchParams.get('vendor') || '',
                        collection: searchParams.get('collection') || '',
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
            setOriginalPrice(baseTotal);
    
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
        if (!name || !contact || !address || !pincode) return;

        setIsSubmitting(true);

        const orderData: Omit<EditableOrder, 'id' | 'paymentStatus' | 'source'> = {
            orderId: orderDetails.orderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode,
            productOrdered: orderDetails.productName, quantity, price: totalPrice.toString(), date: new Date().toISOString(),
            sellerId: orderDetails.sellerId, sellerName: orderDetails.sellerName, paymentMethod,
            size: selectedSize, color: selectedColor, imageDataUris: orderDetails.productImage ? [orderDetails.productImage] : [],
        };
        
        if (paymentMethod === 'Cash on Delivery') {
            const newOrder: EditableOrder = { ...orderData, id: uuidv4(), paymentStatus: 'Pending', source: 'Shopify', isRead: false };
            await saveDocument('orders', newOrder, newOrder.id);
            setStep('complete');
            setIsSubmitting(false);
            return;
        }

        try {
            if (!intentPaid) {
                const intentRes = await fetch('/api/create-mandate-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 1, productName: `Verify ${orderDetails.productName}`, isAuthorization: false, name, email, contact, address, pincode })
                });
                const intentResult = await intentRes.json();
                
                await new Promise<void>((resolve, reject) => {
                    const rzp = new (window as any).Razorpay({
                        key: razorpayKeyId, order_id: intentResult.order_id, amount: 100, name: "Verify Order", description: "Confirming payment method.",
                        handler: async () => {
                            await saveDocument('leads', { ...orderData, id: intentResult.internal_order_id, paymentStatus: 'Intent Verified' }, intentResult.internal_order_id);
                            setIntentPaid(true);
                            resolve();
                        },
                        modal: { ondismiss: () => reject(new Error('Closed')) },
                        prefill: { name, email, contact }, theme: { color: "#663399" }
                    });
                    rzp.open();
                });
            }

            const authRes = await fetch('/api/create-mandate-order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalPrice, productName: orderDetails.productName, isAuthorization: true, name, email, contact, address, pincode })
            });
            const authResult = await authRes.json();
            
            const rzp2 = new (window as any).Razorpay({
                key: razorpayKeyId, order_id: authResult.order_id, amount: totalPrice * 100, name: "Authorize Payment", description: `Authorize ₹${totalPrice.toFixed(2)}`,
                handler: async (response: any) => {
                    const finalId = authResult.internal_order_id;
                    await saveDocument('payment_info', { paymentId: response.razorpay_payment_id, orderId: finalId, status: 'authorized', authorizedAt: new Date().toISOString() }, finalId);
                    const finalOrder: EditableOrder = { ...orderData, id: finalId, paymentStatus: 'Authorized', source: 'Shopify', isRead: false };
                    await saveDocument('orders', finalOrder, finalId);
                    const card = await getOrCreateShaktiCard(finalOrder);
                    if (card) setNewlyCreatedCard(card);
                    setStep('complete');
                },
                modal: { ondismiss: () => setIsSubmitting(false) },
                prefill: { name, email, contact }, theme: { color: "#663399" }
            });
            rzp2.open();
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
                        <CardDescription>Your Order is Confirmed</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">The seller will process your order soon.</p>
                        {newlyCreatedCard && (
                            <div className="pt-4 border-t"><h4 className="font-semibold mb-2">Your Shakti Card is Ready!</h4><div className="flex justify-center"><ShaktiCard card={newlyCreatedCard} /></div></div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Link href="/customer/login" className="w-full"><Button className="w-full">Go to Customer Portal</Button></Link>
                         <Button className="w-full" variant="outline" onClick={() => window.location.href = returnUrl}>Go Back to Store</Button>
                         <a href="https://www.snazzify.co.in" className="text-xs text-muted-foreground hover:underline">Continue shopping on snazzify.co.in</a>
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
                        <CardDescription>Order {orderDetails.orderId}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4 space-y-3">
                                {orderDetails.productImage && (
                                    <div className="my-4 flex justify-center">
                                        <Image src={orderDetails.productImage} alt={orderDetails.productName} width={150} height={150} className="rounded-lg object-contain bg-white" unoptimized />
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Product:</span>
                                    <span className="font-medium text-right">{orderDetails.productName}</span>
                                </div>
                                 <div className="flex justify-between items-center text-sm font-bold text-lg pt-2 border-t">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span>₹{totalPrice.toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="space-y-3">
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
                                    <Label htmlFor="address">Full Delivery Address</Label>
                                    <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="address" required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="pl-9" /></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-semibold">Select Payment Method</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Secure Charge on Delivery' && 'border-primary')}>
                                    <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only"/>
                                    <span className="font-bold">Secure COD</span>
                                </Label>
                                <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Cash on Delivery' && 'border-primary')}>
                                    <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only"/>
                                    <span className="font-bold">Standard COD</span>
                                </Label>
                            </RadioGroup>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {intentPaid ? `Authorize Final Payment: ₹${totalPrice.toFixed(2)}` : 'Proceed to Payment'}
                        </Button>
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

export function SecureCodPaymentForm() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <SecureCodFormContent />
        </Suspense>
    );
}
