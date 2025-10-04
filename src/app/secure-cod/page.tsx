
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
        sellerName: ''
    });
    const [quantity, setQuantity] = useState(1);
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
        const image = searchParams.get('image');

        setOrderDetails({ productName: name, amount, orderId: id, sellerId, sellerName });
        setTotalPrice(amount); // Initialize total price
        setIsSellerFlow(!!(sellerId && sellerId !== 'YOUR_UNIQUE_SELLER_ID'));
        if (image) setProductImage(image);
        
        setCustomerDetails({
            name: searchParams.get('customerName') || '',
            email: searchParams.get('customerEmail') || '',
            contact: searchParams.get('customerContact') || '',
            address: searchParams.get('customerAddress') || '',
            pincode: searchParams.get('customerPincode') || '',
        });
        
        getRazorpayKeyId().then(key => { setLoading(false); setRazorpayKeyId(key); });
    }, [searchParams]);

    const handleQuantityChange = (newQuantity: number) => {
        const q = Math.max(1, newQuantity || 1);
        setQuantity(q);
        setIsAmountConfirmed(false); // Force re-confirmation when quantity changes
    };

    const handleConfirmAmount = () => {
        setTotalPrice(orderDetails.amount * quantity);
        setIsAmountConfirmed(true);
        toast({ title: "Amount Confirmed", description: `Total amount is set to ₹${(orderDetails.amount * quantity).toFixed(2)}` });
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
            sellerId: orderDetails.sellerId, sellerName: orderDetails.sellerName, paymentMethod
        };
        
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
                // The main handler function for Razorpay
                const handleRazorpaySuccess = async (authResponse: any, orderResult: any) => {
                    const finalOrder: EditableOrder = { ...orderData, id: orderResult.internal_order_id, paymentStatus: 'Authorized', source: 'Shopify' };
                    
                    await saveDocument('payment_info', {
                        paymentId: authResponse.razorpay_payment_id,
                        orderId: orderResult.internal_order_id,
                        razorpayOrderId: authResponse.razorpay_order_id,
                        signature: authResponse.razorpay_signature,
                        status: 'authorized',
                        authorizedAt: new Date().toISOString()
                    }, orderResult.internal_order_id);

                    await saveDocument('orders', finalOrder, orderResult.internal_order_id);
                    
                    const leadDoc = await getDocument('leads', orderResult.internal_order_id);
                    if (leadDoc) {
                        await deleteDocument('leads', orderResult.internal_order_id);
                    }
                    
                    const card = await getOrCreateShaktiCard(finalOrder);
                    if (card) setNewlyCreatedCard(card);
                    
                    toast({ title: "Authorization Successful!", description: `Order ${finalOrder.orderId} is confirmed.` });
                    setStep('complete');
                };

                // Create a single order for the final total price
                const authResponse = await fetch('/api/create-mandate-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: totalPrice,
                        productName: orderDetails.productName,
                        isAuthorization: true,
                        name, email, contact, address, pincode
                    })
                });

                const authResult = await authResponse.json();
                if (authResult.error) throw new Error(authResult.error);

                const razorpayOptions = {
                    key: razorpayKeyId,
                    order_id: authResult.order_id,
                    amount: totalPrice * 100,
                    name: "Authorize Secure COD Payment",
                    description: `Securely authorize ₹${totalPrice.toFixed(2)} for your order`,
                    handler: (response: any) => handleRazorpaySuccess(response, authResult),
                    prefill: { name, email, contact },
                    theme: { color: "#663399" },
                    modal: { ondismiss: () => setIsSubmitting(false) }
                };

                const rzp = new (window as any).Razorpay(razorpayOptions);
                rzp.open();

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
                        <CardDescription>{isSellerFlow ? `From ${orderDetails.sellerName}` : `Confirm details for order ${orderDetails.orderId}`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Card className="bg-muted/30">
                             <CardHeader className="p-4">
                                 <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 space-y-3">
                                 {productImage && (
                                    <div className="mb-4 flex justify-center">
                                        <Image
                                            src={productImage}
                                            alt={orderDetails.productName}
                                            width={100}
                                            height={100}
                                            className="rounded-lg object-contain"
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
                                <div className="flex justify-between items-center text-sm">
                                    <Label htmlFor='quantity' className="text-muted-foreground">Quantity:</Label>
                                    <Input 
                                        id="quantity"
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                                        className="h-8 w-20"
                                        min={1}
                                    />
                                </div>
                                <div className="flex justify-between items-center font-bold text-lg pt-2 border-t"><span className="text-muted-foreground">Total Order Amount:</span><span>₹{(orderDetails.amount * quantity).toFixed(2)}</span></div>
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
                         <div className="w-full flex gap-2">
                            <Button type="button" variant="outline" className="w-full" onClick={handleConfirmAmount}>
                                Confirm Amount
                            </Button>
                             <Button type="submit" className="w-full" disabled={isSubmitting || loading || !isAmountConfirmed}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSellerFlow ? "Submit Order Request" : `Pay ₹${totalPrice.toFixed(2)}`}
                            </Button>
                         </div>
                        {!isSellerFlow && <p className="text-xs text-muted-foreground text-center">Your card will be authorized for the full amount. Funds are only captured upon dispatch.</p>}
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
