

'use client';

import { useEffect, useState, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, ShieldCheck, CheckCircle, User, Phone, Mail as MailIcon, Home, MapPin, Edit, ShoppingCart, Pencil } from "lucide-react";
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

type CustomerDetails = {
    name: string;
    email: string;
    contact: string;
    address: string;
    pincode: string;
    alternateContact?: string;
    landmark?: string;
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

    const [isSellerFlow, setIsSellerFlow] = useState(false);
    const [orderDetails, setOrderDetails] = useState({
        productName: 'Your Product',
        amount: 0,
        orderId: '',
        sellerId: '',
        sellerName: '',
        quantity: 1,
        size: '',
        color: '',
        imageUrl: '',
    });
    
    const [totalPrice, setTotalPrice] = useState(0);
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
            if (cardExists) {
                console.log("Shakti Card already exists for this customer.");
                return cardExists; // Return existing card
            }

            const newCard: ShaktiCardData = {
                cardNumber: `SHAKTI-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`,
                customerName: order.customerName,
                customerPhone: order.contactNo,
                customerEmail: order.customerEmail,
                customerAddress: order.customerAddress,
                validFrom: format(new Date(), 'MM/yy'),
                validThru: format(addYears(new Date(), 2), 'MM/yy'),
                points: 100, // Welcome bonus
                cashback: 0,
                sellerId: order.sellerId || 'snazzify',
                sellerName: 'Snazzify',
            };
            
            await saveDocument('shakti_cards', newCard, newCard.cardNumber);
            toast({
                title: "Shakti Card Issued!",
                description: "You've earned a Shakti Card for future benefits!",
            });
            return newCard;
        } catch(e) {
            console.error("Failed to save or find Shakti Card", e);
            return null;
        }
    };

    useEffect(() => {
        const name = searchParams.get('name') || 'Your Product';
        const amount = parseFloat(searchParams.get('amount') || '0');
        const orderId = searchParams.get('order_id') || `LEGACY-${uuidv4().substring(0, 4)}`.toUpperCase();
        const sellerId = searchParams.get('seller_id') || '';
        const sellerName = searchParams.get('seller_name') || '';
        const quantity = parseInt(searchParams.get('quantity') || '1', 10);
        const size = searchParams.get('size') || '';
        const color = searchParams.get('color') || '';
        const imageUrl = searchParams.get('image') || '';

        // Pre-fill customer details if they exist in the URL
        setCustomerDetails({
            name: searchParams.get('customerName') || '',
            email: searchParams.get('customerEmail') || '',
            contact: searchParams.get('customerContact') || '',
            address: searchParams.get('customerAddress') || '',
            pincode: searchParams.get('customerPincode') || '',
        });

        setIsSellerFlow(!!(sellerId && sellerId !== 'YOUR_UNIQUE_SELLER_ID'));
        
        setOrderDetails({ productName: name, amount, orderId, sellerId, sellerName, quantity, size, color, imageUrl });
        
        getRazorpayKeyId().then(key => {
            setRazorpayKeyId(key);
            setLoading(false);
        });

    }, [searchParams]);

     useEffect(() => {
        if (orderDetails.amount > 0) {
            setTotalPrice(orderDetails.amount * orderDetails.quantity);
        } else {
            setTotalPrice(0);
        }
    }, [orderDetails.amount, orderDetails.quantity]);

    const handleSellerFlowSubmit = async () => {
        setIsSubmitting(true);
        const { name, email, contact, address, pincode } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            setIsSubmitting(false);
            return;
        }

        try {
            const leadId = uuidv4();
            const newLead: EditableOrder = {
                id: leadId,
                orderId: orderDetails.orderId,
                customerName: name,
                customerEmail: email,
                customerAddress: address,
                pincode: pincode,
                contactNo: contact,
                productOrdered: orderDetails.productName,
                quantity: orderDetails.quantity,
                size: orderDetails.size,
                color: orderDetails.color,
                price: totalPrice.toString(),
                date: new Date().toISOString(),
                paymentStatus: 'Lead',
                source: orderDetails.sellerId ? 'Seller' : 'Catalogue',
                sellerId: orderDetails.sellerId,
                imageDataUris: orderDetails.imageUrl ? [orderDetails.imageUrl] : [],
            };
            await saveDocument('leads', newLead, leadId);
            setStep('complete');
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdminFlowSubmit = async () => {
        setIsSubmitting(true);
        const { name, email, contact, address, pincode } = customerDetails;

        if (!name || !email || !contact || !address || !pincode) {
             toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out all required fields." });
             setIsSubmitting(false);
             return;
        }
        if (totalPrice <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter the order total and quantity." });
            setIsSubmitting(false);
            return;
        }
        if (!razorpayKeyId) {
             toast({ variant: 'destructive', title: "Razorpay Not Configured" });
             setIsSubmitting(false);
             return;
        }

        try {
             // STEP 1: Create and process the ₹1 intent verification order.
            const intentResponse = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: 1, 
                    productName: `Intent Verification for ${orderDetails.productName}`,
                    isAuthorization: false, // This is a direct payment (payment_capture: 1)
                    name, email, contact, address, pincode
                })
            });

            const intentResult = await intentResponse.json();
            if (intentResult.error) throw new Error(intentResult.error);
            const intentInternalOrderId = intentResult.internal_order_id;
            
            const intentOptions = {
                key: razorpayKeyId,
                amount: 100, // ₹1 in paise
                order_id: intentResult.order_id,
                name: "Snazzify Order Verification",
                description: `₹1 to verify your intent`,
                handler: async (response: any) => {
                    // Create a Lead record after successful ₹1 payment
                    const newLead: EditableOrder = { 
                        id: intentInternalOrderId, orderId: intentInternalOrderId, customerName: name, customerEmail: email, contactNo: contact, customerAddress: address, pincode, productOrdered: orderDetails.productName, quantity: orderDetails.quantity, size: orderDetails.size, color: orderDetails.color, price: totalPrice.toString(), date: new Date().toISOString(), paymentStatus: 'Intent Verified', source: 'Shopify', sellerId: orderDetails.sellerId, imageDataUris: orderDetails.imageUrl ? [orderDetails.imageUrl] : [],
                    };
                    await saveDocument('leads', newLead, intentInternalOrderId);
                    
                    toast({ title: "Verification Successful!", description: "Now proceeding to secure the full order amount." });

                    // STEP 2: Immediately create and open the full amount authorization order.
                    const authResponse = await fetch('/api/create-mandate-order', {
                         method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            amount: totalPrice, 
                            productName: orderDetails.productName,
                            isAuthorization: true, // This is an authorization (payment_capture: 0)
                            name, email, contact, address, pincode
                        })
                    });
                    const authResult = await authResponse.json();
                    if (authResult.error) throw new Error(authResult.error);
                    const finalInternalOrderId = authResult.internal_order_id;

                    const authOptions = {
                        key: razorpayKeyId,
                        order_id: authResult.order_id,
                        name: "Authorize Secure COD Payment",
                        description: `Securely authorize ₹${totalPrice} for ${orderDetails.productName}`,
                        handler: async (authResponse: any) => {
                            // Authorization successful, save payment info and create final order
                            const paymentData: PaymentInfo = {
                                paymentId: authResponse.razorpay_payment_id,
                                orderId: finalInternalOrderId,
                                razorpayOrderId: authResponse.razorpay_order_id,
                                signature: authResponse.razorpay_signature,
                                status: 'authorized',
                                authorizedAt: new Date().toISOString()
                            };
                            await saveDocument('payment_info', paymentData, finalInternalOrderId);
                            
                            const finalOrder: EditableOrder = { 
                                ...newLead, // Carry over all customer details
                                id: finalInternalOrderId, 
                                orderId: finalInternalOrderId,
                                paymentStatus: 'Authorized',
                            };
                            await saveDocument('orders', finalOrder, finalInternalOrderId);
                            
                            // Delete the temporary lead
                            await deleteDocument('leads', intentInternalOrderId);

                            const card = await getOrCreateShaktiCard(finalOrder);
                            if (card) setNewlyCreatedCard(card);
                            
                            toast({ title: "Authorization Successful!", description: `Your order ${finalOrder.orderId} is confirmed.` });
                            setStep('complete');
                        },
                        prefill: { name, email, contact }, theme: { color: "#663399" },
                        modal: { ondismiss: () => setIsSubmitting(false) }
                    };
                    new (window as any).Razorpay(authOptions).open();
                },
                prefill: { name, email, contact }, theme: { color: "#663399" },
                modal: { ondismiss: () => setIsSubmitting(false) }
            };
            new (window as any).Razorpay(intentOptions).open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    if (step === 'complete') {
        const successMessage = isSellerFlow
            ? "Your order request has been sent to the seller. They will contact you shortly with a payment link or for COD confirmation."
            : "Your payment has been authorized! Your order is confirmed and you will receive shipping details soon.";
            
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
                            <div className="pt-4 border-t">
                                <h4 className="font-semibold mb-2">Your Shakti COD Card is Ready!</h4>
                                <div className="flex justify-center">
                                    <ShaktiCard card={newlyCreatedCard} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                     <CardFooter className="flex-col gap-2">
                        <Link href="/customer/login" className="w-full">
                            <Button className="w-full">Go to Customer Portal</Button>
                        </Link>
                         <a href="https://www.snazzify.co.in" className="w-full">
                            <Button className="w-full" variant="outline">Continue Shopping</Button>
                        </a>
                    </CardFooter>
                 </Card>
            </div>
        )
    }
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isSellerFlow) {
            handleSellerFlowSubmit();
        } else {
            handleAdminFlowSubmit();
        }
    };

    const isOrderDetailsMissing = orderDetails.amount === 0 || orderDetails.productName === 'Your Product';


    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle>{isSellerFlow ? "Confirm Your Order" : "Secure Your Order"}</CardTitle>
                        <CardDescription>
                            {isSellerFlow 
                                ? `From ${orderDetails.sellerName}` 
                                : orderDetails.orderId 
                                    ? `Confirm details for order ${orderDetails.orderId}`
                                    : 'Please enter your order details below.'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/30">
                            <CardHeader className="p-4">
                               <div className="flex justify-between items-center">
                                 <CardTitle className="text-lg">Order Summary</CardTitle>
                                 {isOrderDetailsMissing && (
                                     <Button variant="ghost" size="icon" onClick={() => setOrderDetails(d => ({ ...d, amount: NaN }))}>
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                 )}
                               </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-4 text-sm">
                                {orderDetails.imageUrl && (
                                    <div className="flex justify-center mb-4">
                                         <Image 
                                            src={orderDetails.imageUrl}
                                            alt={orderDetails.productName}
                                            width={100}
                                            height={100}
                                            className="rounded-lg object-contain"
                                        />
                                    </div>
                                )}
                                {isOrderDetailsMissing ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="productName">Product Name</Label>
                                            <Input id="productName" value={orderDetails.productName === 'Your Product' ? '' : orderDetails.productName} onChange={(e) => setOrderDetails(d => ({...d, productName: e.target.value}))} placeholder="e.g., Blue Cotton Shirt" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Price per item (INR)</Label>
                                            <Input id="amount" type="number" value={isNaN(orderDetails.amount) || orderDetails.amount === 0 ? '' : orderDetails.amount} onChange={(e) => setOrderDetails(d => ({...d, amount: parseFloat(e.target.value) || 0}))} placeholder="Enter price per item"/>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between"><span className="text-muted-foreground">Product:</span><span className="font-medium text-right">{orderDetails.productName}</span></div>
                                )}
                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" type="number" min="1" value={orderDetails.quantity} onChange={(e) => setOrderDetails(d => ({...d, quantity: parseInt(e.target.value, 10) || 1}))} />
                                    </div>
                                    <div className="flex justify-between font-bold text-lg pt-6"><span className="text-muted-foreground">Total:</span><span>₹{totalPrice.toFixed(2)}</span></div>
                                </div>
                            </CardContent>
                        </Card>

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
