
'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, Edit, ShoppingCart, Pencil, PlusCircle, X } from "lucide-react";
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
import Image from 'next/image';

type LineItem = {
    id: string;
    name: string;
    price: number;
};

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
    
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [orderId, setOrderId] = useState('');
    const [sellerDetails, setSellerDetails] = useState({ id: '', name: '' });
    const [isSellerFlow, setIsSellerFlow] = useState(false);
    const [productImage, setProductImage] = useState<string | null>(null);

    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'details' | 'complete'>('details');
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Prepaid' | 'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);


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
                points: 100, cashback: 0, sellerId: order.sellerId || 'snazzify', sellerName: 'Snazzify',
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
        const name = searchParams.get('name') || '';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const id = searchParams.get('order_id') || `LEGACY-${uuidv4().substring(0, 4)}`.toUpperCase();
        const sellerId = searchParams.get('sellerId') || '';
        const sellerName = searchParams.get('sellerName') || '';
        const image = searchParams.get('image');

        const initialLineItems = name && amount > 0 ? [{ id: uuidv4(), name: name, price: amount }] : [];
        setLineItems(initialLineItems);
        setOrderId(id);
        setSellerDetails({ id: sellerId, name: sellerName });
        setIsSellerFlow(!!(sellerId && sellerId !== 'YOUR_UNIQUE_SELLER_ID'));
        if (image) {
            setProductImage(image);
        }
        
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
        const newTotal = lineItems.reduce((sum, item) => sum + item.price, 0);
        setTotalPrice(newTotal);
    }, [lineItems]);

    const handleLineItemChange = (id: string, field: 'name' | 'price', value: string) => {
        setLineItems(prevItems => prevItems.map(item =>
            item.id === id
                ? { ...item, [field]: field === 'price' ? parseFloat(value) || 0 : value }
                : item
        ));
    };

    const addLineItem = () => {
        setLineItems(prevItems => [...prevItems, { id: uuidv4(), name: '', price: 0 }]);
    };

    const removeLineItem = (id: string) => {
        setLineItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const getProductsDescription = () => lineItems.map(item => item.name).join(', ');

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
            orderId: orderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode,
            productOrdered: getProductsDescription(), quantity: lineItems.length, price: totalPrice.toString(), date: new Date().toISOString(),
            sellerId: sellerDetails.id, sellerName: sellerDetails.name, paymentMethod
        };
        
        // Simplified Logic: All non-seller flows go to full auth, seller flow creates a lead.
        if (isSellerFlow) {
            try {
                const leadId = uuidv4();
                await saveDocument('leads', { ...orderData, id: leadId, paymentStatus: 'Lead', source: 'Seller' }, leadId);
                setStep('complete');
            } catch (error: any) {
                 toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
                 setIsSubmitting(false);
            }
        } else {
            // Admin/Direct Flow
            if (!razorpayKeyId) {
                toast({ variant: 'destructive', title: "Razorpay Not Configured" });
                setIsSubmitting(false);
                return;
            }
            try {
                const intentResponse = await fetch('/api/create-mandate-order', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 1, productName: `Intent Verification`, isAuthorization: false, name, email, contact, address, pincode })
                });
                const intentResult = await intentResponse.json();
                if (intentResult.error) throw new Error(intentResult.error);

                new (window as any).Razorpay({
                    key: razorpayKeyId, amount: 100, order_id: intentResult.order_id, name: "Snazzify Order Verification", description: `₹1 to verify your intent`,
                    handler: async () => {
                        await saveDocument('leads', { ...orderData, id: intentResult.internal_order_id, paymentStatus: 'Intent Verified', source: 'Shopify'}, intentResult.internal_order_id);
                        toast({ title: "Verification Successful!", description: "Proceeding to secure full amount." });

                        const authResponse = await fetch('/api/create-mandate-order', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ amount: totalPrice, productName: getProductsDescription(), isAuthorization: true, name, email, contact, address, pincode })
                        });
                        const authResult = await authResponse.json();
                        if (authResult.error) throw new Error(authResult.error);

                        new (window as any).Razorpay({
                            key: razorpayKeyId, order_id: authResult.order_id, name: "Authorize Secure COD Payment", description: `Securely authorize ₹${totalPrice} for your order`,
                            handler: async (authResponse: any) => {
                                const finalOrder: EditableOrder = { ...orderData, id: authResult.internal_order_id, paymentStatus: 'Authorized', source: 'Shopify' };
                                await saveDocument('payment_info', { paymentId: authResponse.razorpay_payment_id, orderId: authResult.internal_order_id, razorpayOrderId: authResponse.razorpay_order_id, signature: authResponse.razorpay_signature, status: 'authorized', authorizedAt: new Date().toISOString() }, authResult.internal_order_id);
                                await saveDocument('orders', finalOrder, authResult.internal_order_id);
                                await deleteDocument('leads', intentResult.internal_order_id);
                                
                                const card = await getOrCreateShaktiCard(finalOrder);
                                if (card) setNewlyCreatedCard(card);
                                
                                toast({ title: "Authorization Successful!", description: `Order ${finalOrder.orderId} is confirmed.` });
                                setStep('complete');
                            },
                            prefill: { name, email, contact }, theme: { color: "#663399" }, modal: { ondismiss: () => setIsSubmitting(false) }
                        }).open();
                    },
                    prefill: { name, email, contact }, theme: { color: "#663399" }, modal: { ondismiss: () => setIsSubmitting(false) }
                }).open();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setIsSubmitting(false);
            }
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        const successMessage = isSellerFlow ? "Your order request has been sent. The seller will contact you shortly." : "Your payment has been authorized! Your order is confirmed.";
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
                        <CardTitle>{isSellerFlow ? "Confirm Your Order" : "Secure Your Order"}</CardTitle>
                        <CardDescription>{isSellerFlow ? `From ${sellerDetails.name}` : `Confirm details for order ${orderId}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/30">
                            <CardHeader className="p-4 flex flex-row items-center justify-between">
                                 <CardTitle className="text-lg">Order Summary</CardTitle>
                                 <Button type="button" size="sm" variant="ghost" onClick={addLineItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                 {productImage && lineItems.length === 1 && (
                                    <div className="mb-4 flex justify-center">
                                        <Image
                                            src={productImage}
                                            alt={lineItems[0].name}
                                            width={100}
                                            height={100}
                                            className="rounded-lg object-contain"
                                        />
                                    </div>
                                 )}
                                {lineItems.map((item, index) => (
                                    <div key={item.id} className="flex items-end gap-2">
                                        <div className="flex-grow space-y-1">
                                            <Label htmlFor={`item-name-${index}`} className="text-xs">Product Name</Label>
                                            <Input id={`item-name-${index}`} value={item.name} onChange={e => handleLineItemChange(item.id, 'name', e.target.value)} placeholder="e.g., Blue Cotton Shirt" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`item-price-${index}`} className="text-xs">Price (INR)</Label>
                                            <Input id={`item-price-${index}`} type="number" value={item.price} onChange={e => handleLineItemChange(item.id, 'price', e.target.value)} placeholder="e.g., 499" className="w-28" />
                                        </div>
                                        <Button type="button" size="icon" variant="ghost" onClick={() => removeLineItem(item.id)} className="shrink-0"><X className="h-4 w-4 text-muted-foreground"/></Button>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t"><span className="text-muted-foreground">Total:</span><span>₹{totalPrice.toFixed(2)}</span></div>
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
                            {isSellerFlow ? "Submit Order Request" : `Proceed to Pay ₹${totalPrice.toFixed(2)}`}
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

    