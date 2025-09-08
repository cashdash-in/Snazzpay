
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, HelpCircle, AlertTriangle, User, Phone, Home, MapPin, BadgeCheck, ShieldCheck, CreditCard, Mail, Wallet, LogIn, Zap, MessageSquare } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { format, addYears } from 'date-fns';
import type { EditableOrder } from '@/app/orders/page';
import { ScratchCard } from '@/components/scratch-card';
import { CancellationForm } from '@/components/cancellation-form';
import { getRazorpayKeyId } from '../actions';
import { ShaktiCard, ShaktiCardData } from '@/components/shakti-card';
import { sanitizePhoneNumber } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface SecureCodFormProps {
    razorpayKeyId: string;
}

type Step = 'details' | 'otp' | 'scratch' | 'complete';


function getNextOrderId(): string {
    const counter = parseInt(localStorage.getItem('secureCodOrderCounter') || '101', 10);
    const orderId = `SCOD-${counter.toString()}`;
    return orderId;
}

function incrementOrderIdCounter() {
    const counter = parseInt(localStorage.getItem('secureCodOrderCounter') || '101', 10);
    localStorage.setItem('secureCodOrderCounter', (counter + 1).toString());
}


function SecureCodForm({ razorpayKeyId }: SecureCodFormProps) {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [step, setStep] = useState<Step>('details');
    const [orderDetails, setOrderDetails] = useState({
        productName: '',
        baseAmount: 0,
        quantity: 1,
        orderId: '',
        sellerId: '', // To track which seller's order this is
        sellerName: 'Snazzify'
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
    const [activeLead, setActiveLead] = useState<EditableOrder | null>(null);
    const [shaktiCard, setShaktiCard] = useState<ShaktiCardData | null>(null);
    const [otp, setOtp] = useState('');
    const [paymentStep, setPaymentStep] = useState<'intent' | 'authorization'>('intent');


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
        
        // ** THE FIX IS HERE **
        // We ALWAYS generate a new order ID for every visit to this page
        // unless a specific one is being re-tried from a link.
        // This prevents the reuse of product IDs as order IDs.
        const orderIdFromUrl = searchParams.get('order_id');
        let initialOrderId = orderIdFromUrl && !orderIdFromUrl.includes('{{') ? orderIdFromUrl : getNextOrderId();

        const sellerId = searchParams.get('seller_id') || 'default_seller';
        
        let sellerName = searchParams.get('seller_name');
        if (!sellerName || sellerName === 'YOUR_SELLER_NAME' || sellerName.includes('{{')) {
            sellerName = 'Snazzify';
        }
        
        let initialAmount = 1;
        let initialName = 'Sample Product';
        

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
            orderId: initialOrderId,
            sellerId: sellerId,
            sellerName: sellerName
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

    const createOrderApi = async (isIntent: boolean) => {
        const paymentAmount = isIntent ? 1 : totalAmount;
        const response = await fetch('/api/create-mandate-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: paymentAmount,
                productName: orderDetails.productName,
                customerName: customerDetails.name,
                customerEmail: customerDetails.email,
                customerContact: customerDetails.contact,
                customerAddress: customerDetails.address,
                customerPincode: customerDetails.pincode,
                isAuthorization: !isIntent,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create order.');
        }

        return response.json();
    };
    
    // Generates a unique 16-digit card number in 4x4 format
    const generateCardNumber = () => {
        let number = '';
        for (let i = 0; i < 4; i++) {
            number += Math.floor(1000 + Math.random() * 9000).toString();
        }
        return number.replace(/(\d{4})/g, '$1 ').trim();
    };


    const openRazorpayCheckout = (order_id: string, isIntent: boolean) => {
        const options = {
            key: razorpayKeyId,
            order_id: order_id,
            name: isIntent ? "Snazzify Intent Verification" : "Snazzify Trust Wallet",
            description: isIntent ? `Pay ₹1.00 to verify your order` : `Pay ₹${totalAmount.toFixed(2)} - Held in Trust`,
            handler: isIntent ? intentHandler : authorizationHandler,
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
                        title: 'Payment Cancelled',
                        description: 'The payment process was cancelled.',
                    });
                }
            }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const intentHandler = (response: any) => {
        const leadData: EditableOrder = {
            id: uuidv4(),
            orderId: orderDetails.orderId,
            customerName: customerDetails.name,
            customerEmail: customerDetails.email,
            customerAddress: customerDetails.address,
            pincode: customerDetails.pincode,
            contactNo: customerDetails.contact,
            productOrdered: orderDetails.productName,
            quantity: orderDetails.quantity,
            price: totalAmount.toFixed(2),
            paymentStatus: 'Intent Verified',
            date: format(new Date(), 'yyyy-MM-dd'),
        };
        setActiveLead(leadData);

        // Add to leads
        const existingLeads = JSON.parse(localStorage.getItem('leads') || '[]');
        localStorage.setItem('leads', JSON.stringify([...existingLeads, leadData]));

        const storedOverrides = JSON.parse(localStorage.getItem(`order-override-${orderDetails.orderId}`) || '{}');
        const newOverrides = { ...storedOverrides, paymentStatus: 'Intent Verified' };
        localStorage.setItem(`order-override-${orderDetails.orderId}`, JSON.stringify(newOverrides));

        toast({ title: 'Verification Successful!', description: 'Please proceed to secure your order.' });
        setStep('otp'); // Move to OTP step
        setIsProcessing(false);
    };

    const authorizationHandler = (response: any) => {
         const paymentInfo = {
            paymentId: response.razorpay_payment_id,
            orderId: orderDetails.orderId,
            razorpayOrderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
            status: 'authorized',
            authorizedAt: new Date().toISOString()
        };
        localStorage.setItem(`payment_info_${orderDetails.orderId}`, JSON.stringify(paymentInfo));
        
        const sanitizedMobile = sanitizePhoneNumber(customerDetails.contact);
        const cardDataJSON = localStorage.getItem(`shakti_card_${sanitizedMobile}`);
        
        if (!cardDataJSON) {
            const now = new Date();
            const newShaktiCard: ShaktiCardData = {
                cardNumber: generateCardNumber(),
                customerName: customerDetails.name,
                customerPhone: customerDetails.contact,
                customerEmail: customerDetails.email || '',
                customerAddress: `${customerDetails.address}, ${customerDetails.pincode}`,
                validFrom: format(now, 'MM/yy'),
                validThru: format(addYears(now, 3), 'MM/yy'),
                points: 0,
                cashback: 0,
                sellerId: orderDetails.sellerId,
                sellerName: orderDetails.sellerName
            };
            localStorage.setItem(`shakti_card_${sanitizedMobile}`, JSON.stringify(newShaktiCard));
            const allCardsDB = JSON.parse(localStorage.getItem('shakti_cards_db') || '[]');
            allCardsDB.push(newShaktiCard);
            localStorage.setItem('shakti_cards_db', JSON.stringify(allCardsDB));
            setShaktiCard(newShaktiCard);
             toast({ title: 'Payment Secured & Shakti Card Issued!', description: 'Your order is confirmed and your new loyalty card is ready.' });
        } else {
            setShaktiCard(JSON.parse(cardDataJSON));
            toast({ title: 'Payment Secured!', description: 'Your order is confirmed. Benefits will be added to your existing Shakti Card.' });
        }

        try {
            const newOrder: EditableOrder = {
                id: orderDetails.orderId, // Use the order ID as the primary ID
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
                source: orderDetails.sellerId === 'default_seller' ? 'Manual' : 'Seller'
            };

            const manualOrdersJSON = localStorage.getItem('manualOrders');
            let manualOrders: EditableOrder[] = manualOrdersJSON ? JSON.parse(manualOrdersJSON) : [];
            
            const existingOrderIndex = manualOrders.findIndex(o => o.orderId === newOrder.orderId);
            
            if (existingOrderIndex > -1) {
                manualOrders[existingOrderIndex] = { ...manualOrders[existingOrderIndex], ...newOrder, id: manualOrders[existingOrderIndex].id };
            } else {
               manualOrders.push(newOrder);
            }
            localStorage.setItem('manualOrders', JSON.stringify(manualOrders));
            
            if (!searchParams.get('order_id')) {
                incrementOrderIdCounter();
            }

            if (activeLead) {
                const existingLeadsJSON = localStorage.getItem('leads');
                if (existingLeadsJSON) {
                    const existingLeads: EditableOrder[] = JSON.parse(existingLeadsJSON);
                    const updatedLeads = existingLeads.filter(lead => lead.id !== activeLead.id);
                    localStorage.setItem('leads', JSON.stringify(updatedLeads));
                }
            }

        } catch(e) {
            console.error("Failed to update local storage after authorization", e);
        }
        
        localStorage.setItem('loggedInUserMobile', customerDetails.contact);
        setStep('complete');
        setIsProcessing(false);
    };

    const handlePayment = async (isIntent: boolean) => {
        setIsProcessing(true);
        setError('');
        
        if (!isIntent) {
            if (!agreed) {
                toast({ variant: 'destructive', title: 'Agreement Required', description: 'You must agree to the Terms and Conditions.' });
                setIsProcessing(false);
                return;
            }
            if (!customerDetails.name || !customerDetails.contact || !customerDetails.address || !customerDetails.pincode) {
                toast({ variant: 'destructive', title: 'Details Required', description: 'Please fill in all customer details before proceeding.' });
                setIsProcessing(false);
                return;
            }
        } else {
             if (!customerDetails.name || !customerDetails.contact || !customerDetails.address || !customerDetails.pincode) {
                toast({ variant: 'destructive', title: 'Details Required', description: 'Please fill in all customer details before proceeding.' });
                setIsProcessing(false);
                return;
            }
        }
        
        try {
            const { order_id } = await createOrderApi(isIntent);
            openRazorpayCheckout(order_id, isIntent);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Error', description: e.message });
            setIsProcessing(false);
        }
    };
    
    const handleOtpConfirmation = () => {
        // In a real app, you'd verify the OTP. Here we just simulate success.
        if (otp === '123456') { // Mock OTP
            setStep('scratch');
            toast({ title: "Mobile Number Verified!", description: "You can now proceed to the final payment."});
        } else {
            toast({ variant: 'destructive', title: "Invalid OTP", description: "Please enter the correct OTP (Hint: 123456)." });
        }
    };

    const proceedToAuthorization = () => {
        handlePayment(false); 
    }

    const renderOtpState = () => (
         <Card className="w-full max-w-md shadow-lg text-center bg-transparent border-0">
            <CardHeader className="pb-4">
                <MessageSquare className="mx-auto h-12 w-12 text-primary" />
                <CardTitle>Verify Your Mobile Number</CardTitle>
                <CardDescription>
                    An OTP has been sent to <strong>{customerDetails.contact}</strong>. Please enter it below to continue.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
                 <Input
                    id="otp-input"
                    type="tel"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-48 text-center text-lg tracking-[0.3em]"
                />
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleOtpConfirmation}>
                    Confirm OTP &amp; Proceed
                </Button>
            </CardFooter>
        </Card>
    );

    const renderScratchState = () => (
         <Card className="w-full max-w-md shadow-lg text-center bg-transparent border-0">
            <CardHeader className="pb-4">
                <BadgeCheck className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle>Verification Successful!</CardTitle>
                <CardDescription>Scratch below to reveal a special offer for your next purchase!</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4">
                 <ScratchCard
                    width={320}
                    height={180}
                    scratchImageSrc="https://picsum.photos/320/180"
                    data-ai-hint="abstract pattern"
                >
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-300 to-orange-400 text-gray-800 p-4 rounded-lg">
                        <p className="text-lg font-bold">Congratulations!</p>
                        <p className="text-4xl font-black">10% OFF</p>
                        <p className="mt-2 text-xs">On your next order with code:</p>
                        <p className="font-mono text-lg bg-white/30 px-2 py-1 rounded">SNAZZY10</p>
                    </div>
                </ScratchCard>
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={proceedToAuthorization} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Proceed to Pay ₹{totalAmount.toFixed(2)}
                </Button>
            </CardFooter>
        </Card>
    );

    const renderCompleteState = () => (
        <Card className="w-full max-w-md shadow-lg text-center bg-transparent border-0">
            <CardHeader className="pb-4">
                <BadgeCheck className="mx-auto h-12 w-12 text-green-500" />
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>Your Shakti COD Card is ready. Welcome to the family!</CardDescription>
            </CardHeader>
             <CardContent className="flex flex-col items-center justify-center space-y-4">
                {shaktiCard ? <ShaktiCard card={shaktiCard} /> : <Loader2 className="h-8 w-8 animate-spin" />}
                 <Link href="/customer/login" className="w-full">
                    <Button variant="outline" className="w-full">
                        <LogIn className="mr-2 h-4 w-4" /> Go to My Dashboard
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
    
    if (action === 'cancel') {
        return null;
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
        );
    }
    
    if (step === 'otp') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderOtpState()}</div>;
    }
    if (step === 'scratch') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderScratchState()}</div>;
    }
    if (step === 'complete') {
        return <div className="flex items-center justify-center min-h-screen bg-transparent p-4">{renderCompleteState()}</div>;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <Zap className="mx-auto h-8 w-8 text-primary" />
                    <CardTitle>Modern, Secure Payment</CardTitle>
                    <CardDescription>{isProcessing ? 'Processing...' : `First, verify your intent for ${orderDetails.sellerName} with a ₹1 payment.`}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <Label>Customer Details</Label>
                        <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-name" placeholder="Full Name" value={customerDetails.name} onChange={(e) => handleCustomerDetailChange('name', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-email" placeholder="Email Address for Notifications" value={customerDetails.email} onChange={(e) => handleCustomerDetailChange('email', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-contact" placeholder="Contact Number for Notifications" value={customerDetails.contact} onChange={(e) => handleCustomerDetailChange('contact', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-address" placeholder="Street Address" value={customerDetails.address} onChange={(e) => handleCustomerDetailChange('address', e.target.value)} className="pl-9" /></div>
                        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="customer-pincode" placeholder="Pincode" value={customerDetails.pincode} onChange={(e) => handleCustomerDetailChange('pincode', e.target.value)} className="pl-9" /></div>
                    </div>
                    <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center"><Label className="text-muted-foreground">Product:</Label><span className="font-medium text-right">{orderDetails.productName}</span></div>
                        <div className="flex justify-between items-center"><Label htmlFor="quantity" className="text-muted-foreground">Quantity:</Label><Input id="quantity" type="number" value={orderDetails.quantity} onChange={handleQuantityChange} className="w-20 text-center" min="1" /></div>
                        <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Amount:</span><span className="font-bold">₹{totalAmount.toFixed(2)}</span></div>
                    </div>
                    
                    <div className="flex items-start space-x-2 pt-2">
                        <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked as boolean)} className="mt-1" />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground">I agree to the <Link href="/terms/customer" target="_blank" className="underline text-primary">Terms and Conditions</Link>.</Label>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" onClick={() => handlePayment(true)} disabled={!agreed || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                        Verify with ₹1.00
                    </Button>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                        <Link href="/customer/login" passHref>
                            <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><LogIn className="h-4 w-4" />Customer Login</span>
                        </Link>
                        <Link href="/faq" passHref>
                            <span className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"><HelpCircle className="h-4 w-4" />How does this work?</span>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

function Page() {
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchKey() {
            try {
                const key = await getRazorpayKeyId();
                setRazorpayKeyId(key);
            } catch (error) {
                console.error("Failed to fetch razorpay key", error);
            } finally {
                setLoading(false);
            }
        }
        fetchKey();
    }, []);

    const searchParams = useSearchParams();
    const action = searchParams.get('action');

    // Display loader only if we are not in cancellation mode and the key is still being fetched.
    const showLoader = !action && loading;

    return (
       <div className="relative min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
            {showLoader && <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {!showLoader && razorpayKeyId && <SecureCodForm razorpayKeyId={razorpayKeyId} />}
            <CancellationForm />
        </div>
    );
}

export default function SuspendedPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <Page />
    </Suspense>
  );
}
