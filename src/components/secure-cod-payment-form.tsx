
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, Percent } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { EditableOrder } from '@/app/orders/page';
import { getRazorpayKeyId } from '@/app/actions';
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
    id: string; // e.g., 'collection_12345', 'vendor_MyVendor', 'product_67890'
    type: 'collection' | 'vendor' | 'product';
    name: string; // Name of the collection, vendor, or product
    discount: number;
};

export function SecureCodPaymentForm() {
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
    
    const availableSizes = searchParams.get('sizes')?.split(',').filter(s => s) || [];
    const availableColors = searchParams.get('colors')?.split(',').filter(c => c) || [];

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

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

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
        let image = searchParams.get('image') || '';
        const productId = searchParams.get('productId') || '';
        const vendor = searchParams.get('vendor') || '';
        const collection = searchParams.get('collection') || '';

        if (image && !image.startsWith('http')) {
            image = 'https:' + image;
        }
        
        setOrderDetails({ productName: name, amount, orderId: id, sellerId, sellerName, productImage: image, productId, vendor, collection });
        
        if (availableSizes.length > 0) setSelectedSize(availableSizes[0]);
        if (availableColors.length > 0) setSelectedColor(availableColors[0]);

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
        async function calculatePrice() {
            const baseTotal = orderDetails.amount * quantity;
            setOriginalPrice(baseTotal);
    
            // No discount for COD
            if (paymentMethod === 'Cash on Delivery') {
                setTotalPrice(baseTotal);
                setAppliedDiscount(null);
                return;
            }
    
            // Only apply discount for Secure COD
            try {
                const discounts = await getCollection<DiscountRule>('discounts');
                const productDiscount = discounts.find(d => d.id === `product_${orderDetails.productId}`);
                const vendorDiscount = discounts.find(d => d.id === `vendor_${orderDetails.vendor}`);
                const collectionDiscount = discounts.find(d => d.id === `collection_${orderDetails.collection}`);
                
                const bestDiscount = productDiscount || vendorDiscount || collectionDiscount || null;
                
                if (bestDiscount) {
                    setAppliedDiscount(bestDiscount);
                    const discountedTotal = baseTotal - (baseTotal * (bestDiscount.discount / 100));
                    setTotalPrice(discountedTotal);
                } else {
                    setTotalPrice(baseTotal);
                    setAppliedDiscount(null);
                }
            } catch (error) {
                console.error("Could not fetch discounts:", error);
                setTotalPrice(baseTotal);
                setAppliedDiscount(null);
            }
        }
        if (orderDetails.amount > 0) {
            calculatePrice();
        }
    }, [quantity, orderDetails, paymentMethod]);


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
            sellerId: orderDetails.sellerId, sellerName: orderDetails.sellerName, paymentMethod,
            size: selectedSize, color: selectedColor,
            originalPrice: originalPrice.toString(),
            discountPercentage: appliedDiscount?.discount,
            discountAmount: originalPrice - totalPrice,
        };
        
        if (paymentMethod === 'Cash on Delivery') {
            const newOrder: EditableOrder = { ...orderData, id: uuidv4(), paymentStatus: 'Pending', source: 'Shopify' };
            await saveDocument('orders', newOrder, newOrder.id);
            toast({ title: "Order Placed!", description: `Your Cash on Delivery order ${newOrder.orderId} has been confirmed.` });
            setStep('complete');
            setIsSubmitting(false);
            return;
        }

        // --- Secure COD Flow ---
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
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (step === 'complete') {
        const successMessage = paymentMethod === 'Cash on Delivery' 
            ? "Your COD order has been successfully placed!" 
            : "Your payment has been authorized! Your order is confirmed.";
        return (
            <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>
                            {paymentMethod === 'Cash on Delivery' ? 'Order Placed!' : 'Payment Authorized!'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{successMessage}</p>
                        {newlyCreatedCard && (
                            <div className="pt-4 border-t"><h4 className="font-semibold mb-2">Your Shakti Card is Ready!</h4><div className="flex justify-center"><ShaktiCard card={newlyCreatedCard} /></div></div>
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
                             <CardHeader className="p-4 flex flex-row justify-between items-center">
                                 <CardTitle className="text-lg">Order Summary</CardTitle>
                                 {appliedDiscount && paymentMethod === 'Secure Charge on Delivery' && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                        <Percent className="mr-1 h-3 w-3"/> {appliedDiscount.discount}% OFF Applied!
                                    </Badge>
                                 )}
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
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                    <div className="space-y-1">
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
                                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                                    <span className="text-muted-foreground">Total:</span>
                                    <div className="text-right">
                                        <span className={cn('transition-colors', appliedDiscount && paymentMethod === 'Secure Charge on Delivery' ? 'text-destructive' : 'text-foreground')}>₹{totalPrice.toFixed(2)}</span>
                                        {appliedDiscount && paymentMethod === 'Secure Charge on Delivery' && <span className="text-sm font-normal text-muted-foreground ml-2 line-through">₹{originalPrice.toFixed(2)}</span>}
                                    </div>
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

                        <div className="space-y-3">
                            <Label className="font-semibold">Select Payment Method</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(value: 'Secure Charge on Delivery' | 'Cash on Delivery') => setPaymentMethod(value)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Secure Charge on Delivery' && 'border-primary')}>
                                    <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only"/>
                                    <span className="font-bold">Secure COD</span>
                                    <span className={cn("text-sm text-center", appliedDiscount ? 'text-green-600' : 'text-muted-foreground')}>
                                        {appliedDiscount ? `Includes a ${appliedDiscount.discount}% discount!` : 'Pay online now, safely.'}
                                    </span>
                                </Label>
                                 <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Cash on Delivery' && 'border-primary')}>
                                    <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only"/>
                                    <span className="font-bold">Cash on Delivery</span>
                                    <span className="text-sm text-muted-foreground text-center">Pay cash to the courier.</span>
                                </Label>
                            </RadioGroup>
                        </div>

                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {paymentMethod === 'Cash on Delivery' ? 'Place COD Order' : 'Proceed to Secure Payment'}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            {paymentMethod === 'Secure Charge on Delivery' 
                                ? "Your card will be authorized for the total amount. Funds are only captured upon dispatch."
                                : "The courier will collect the cash amount upon delivery."
                            }
                        </p>
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
