
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShoppingCart, User, Phone, Mail as MailIcon, Home, MapPin, CheckCircle, Percent } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveDocument, getDocument, getCollection } from '@/services/firestore';
import type { EditableOrder } from '../orders/page';
import { v4 as uuidv4 } from 'uuid';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import type { ProductDrop } from '../vendor/product-drops/page';
import type { SellerUser } from '../seller-accounts/page';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, addYears } from 'date-fns';
import { sanitizePhoneNumber } from '@/lib/utils';
import { ShaktiCard, ShaktiCardData } from '@/components/shakti-card';
import Link from 'next/link';

type DisplayProduct = (SellerProduct | ProductDrop) & { 
    price: number; 
    sellerName: string; 
    sellerId: string;
    productId: string;
    vendor: string;
    collection: string;
    allowedPaymentMethods?: string[];
};

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


const createNewShaktiCard = async (order: EditableOrder): Promise<ShaktiCardData | null> => {
    if (!order.contactNo || !order.customerEmail) return null;
    const sanitizedMobile = sanitizePhoneNumber(order.contactNo);
    try {
        const existingCards = await getCollection<ShaktiCardData>('shakti_cards');
        const cardExists = existingCards.find(card => card.customerPhone === sanitizedMobile);
        if (cardExists) {
            console.log("Shakti Card already exists for this customer.");
            return cardExists;
        }

        const newCard: ShaktiCardData = {
            cardNumber: `SHAKTI-${uuidv4().substring(0, 4).toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`,
            customerName: order.customerName,
            customerPhone: order.contactNo,
            customerEmail: order.customerEmail,
            customerAddress: order.customerAddress,
            validFrom: format(new Date(), 'MM/yy'),
            validThru: format(addYears(new Date(), 2), 'MM/yy'),
            points: 100,
            cashback: 0,
            sellerId: order.sellerId || 'snazzify',
            sellerName: order.sellerName || 'Snazzify',
        };
        
        await saveDocument('shakti_cards', newCard, newCard.cardNumber);
        return newCard;
    } catch(e) {
        console.error("Failed to save or find Shakti Card", e);
        return null;
    }
};

function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<DisplayProduct | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);

    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Secure COD' | 'Cash on Delivery' | 'Prepaid'>('Secure COD');
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrderComplete, setIsOrderComplete] = useState(false);
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [originalPrice, setOriginalPrice] = useState(0);
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
    const [returnUrl, setReturnUrl] = useState('https://www.snazzify.co.in');
    
    const [availableSizes, setAvailableSizes] = useState<string[]>([]);
    const [availableColors, setAvailableColors] = useState<string[]>([]);
    const [allowedPaymentMethods, setAllowedPaymentMethods] = useState<string[]>([]);
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        // Track session start
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'magazineSessionStart' }),
            keepalive: true,
        });

        const handleUnload = () => {
             fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'sessionEnd', type: 'magazine' }),
                keepalive: true,
            });
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            handleUnload();
        };
    }, []);

    useEffect(() => {
        const redirectUrl = searchParams.get('return_url');
        if (redirectUrl) {
            setReturnUrl(redirectUrl);
        }
        
        async function fetchProductAndKey() {
            const productId = searchParams.get('id');
            const urlSellerId = searchParams.get('sellerId');
            const urlSellerName = searchParams.get('sellerName');
            const discountParam = searchParams.get('discount');

            try {
                const response = await fetch('/api/get-key');
                if (!response.ok) throw new Error('Failed to fetch Razorpay key');
                const { keyId } = await response.json();
                setRazorpayKeyId(keyId);

                if (!productId) {
                    toast({ variant: 'destructive', title: "Product not found" });
                    return;
                }

                let fetchedProduct: SellerProduct | ProductDrop | null = await getDocument<SellerProduct>('seller_products', productId);
                let productType = 'seller_product';
                if (!fetchedProduct) {
                    fetchedProduct = await getDocument<ProductDrop>('product_drops', productId);
                    productType = 'product_drop';
                }

                if (fetchedProduct) {
                    const price = (fetchedProduct as SellerProduct).price ?? (fetchedProduct as ProductDrop).costPrice;
                    
                    const displayProduct: DisplayProduct = {
                        ...fetchedProduct,
                        price: price,
                        sellerName: urlSellerName || (fetchedProduct as SellerProduct).sellerName || (fetchedProduct as ProductDrop).vendorName,
                        sellerId: urlSellerId || (fetchedProduct as SellerProduct).sellerId || (fetchedProduct as any).vendorId,
                        productId: fetchedProduct.id,
                        vendor: productType === 'product_drop' ? (fetchedProduct as ProductDrop).vendorName : ((fetchedProduct as SellerProduct).sellerName || ''),
                        collection: (fetchedProduct as any).category || '',
                        allowedPaymentMethods: (fetchedProduct as any).allowedPaymentMethods,
                    };
                    setProduct(displayProduct);

                    const productMethods = (fetchedProduct as any).allowedPaymentMethods || ['Secure COD', 'Cash on Delivery', 'Prepaid'];
                    setAllowedPaymentMethods(productMethods);

                    if (productMethods.includes('Secure COD')) setPaymentMethod('Secure COD');
                    else if (productMethods.includes('Cash on Delivery')) setPaymentMethod('Cash on Delivery');
                    else if (productMethods.includes('Prepaid')) setPaymentMethod('Prepaid');

                    const sizes = (fetchedProduct as any).sizes || [];
                    const colors = (fetchedProduct as any).colors || [];
                    setAvailableSizes(sizes);
                    setAvailableColors(colors);
                    if (sizes.length > 0) setSelectedSize(sizes[0]);
                    if (colors.length > 0) setSelectedColor(colors[0]);

                    let bestDiscount: DiscountRule | null = null;
                    if(discountParam && parseFloat(discountParam) > 0) {
                        bestDiscount = { id: 'link_discount', type: 'collection', name: 'Special Offer', discount: parseFloat(discountParam) };
                    } else {
                        const discounts = await getCollection<DiscountRule>('discounts');
                        const productDiscount = discounts.find(d => d.id === 'product_' + displayProduct.productId);
                        const vendorDiscount = discounts.find(d => d.id === 'vendor_' + displayProduct.vendor);
                        const collectionDiscount = discounts.find(d => d.id === 'collection_' + displayProduct.collection);
                        bestDiscount = productDiscount || vendorDiscount || collectionDiscount || null;
                    }
                    setAppliedDiscount(bestDiscount);
                } else {
                    toast({ variant: 'destructive', title: "Product not found" });
                }
            } catch (e) {
                console.error("Error fetching data:", e);
                toast({ variant: 'destructive', title: "Error", description: "There was a problem loading the product or payment gateway." });
            } finally {
                setIsLoadingProduct(false);
            }
        }
        fetchProductAndKey();
    }, [searchParams, toast]);

    useEffect(() => {
        if (product) {
            const baseTotal = ((product as SellerProduct).price || (product as ProductDrop).costPrice) * quantity;
            setOriginalPrice(baseTotal);
            
            if (appliedDiscount && paymentMethod === 'Secure COD') {
                const discountedTotal = baseTotal - (baseTotal * (appliedDiscount.discount / 100));
                setTotalPrice(discountedTotal);
            } else {
                setTotalPrice(baseTotal);
            }
        }
    }, [quantity, product, paymentMethod, appliedDiscount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        const { name, contact, address, pincode, email } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            return;
        }

        setIsSubmitting(true);
        const orderId = uuidv4();

        const orderData: EditableOrder = {
            id: orderId,
            orderId: '#SMRT-' + Math.floor(1000 + Math.random() * 9000),
            productId: product.productId,
            customerName: name, customerEmail: email, customerAddress: address, pincode, contactNo: contact,
            productOrdered: product.title, quantity, size: selectedSize, color: selectedColor,
            price: totalPrice.toString(), originalPrice: originalPrice.toString(),
            date: new Date().toISOString(), paymentStatus: 'Lead', paymentMethod, source: 'Catalogue',
            sellerId: product.sellerId, sellerName: product.sellerName, isRead: false,
            imageDataUris: product.imageDataUris,
        };

        if ((paymentMethod === 'Secure COD' || paymentMethod === 'Prepaid') && appliedDiscount) {
            orderData.discountPercentage = appliedDiscount.discount;
            orderData.discountAmount = originalPrice - totalPrice;
        }

        // --- Handle Different Payment Methods ---

        if (paymentMethod === 'Cash on Delivery') {
            orderData.paymentStatus = 'Pending';
            await saveDocument('orders', orderData, orderData.id);
            toast({ title: 'Order Placed!', description: `Your Cash on Delivery order has been confirmed.` });
            setIsOrderComplete(true);
            setIsSubmitting(false);
            return;
        }

        if (paymentMethod === 'Secure COD') {
            await saveDocument('leads', orderData, orderData.id);
            const secureCodUrl = new URL(`${window.location.origin}/secure-cod`);
            for (const key in orderDetails) {
                if (orderDetails[key as keyof typeof orderDetails]) {
                    secureCodUrl.searchParams.set(key, orderDetails[key as keyof typeof orderDetails] as string);
                }
            }
            secureCodUrl.searchParams.set('amount', totalPrice.toString());
            secureCodUrl.searchParams.set('order_id', orderData.id); // pass the new lead ID
            Object.entries(customerDetails).forEach(([key, value]) => value && secureCodUrl.searchParams.set(`customer${key.charAt(0).toUpperCase() + key.slice(1)}`, value));
            router.push(secureCodUrl.toString());
            return;
        }

        if (paymentMethod === 'Prepaid') {
            if (!razorpayKeyId) {
                toast({ variant: 'destructive', title: "Payment Gateway Error", description: "Could not initialize payment. Please try again later." });
                setIsSubmitting(false);
                return;
            }

            try {
                const response = await fetch('/api/create-mandate-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: totalPrice, productName: orderDetails.productName, isAuthorization: false, name, email, contact, address, pincode })
                });
                const result = await response.json();
                if (result.error) throw new Error(result.error);

                const options = {
                    key: razorpayKeyId, order_id: result.order_id, amount: totalPrice * 100, name: "Snazzify Purchase", description: `Payment for ${orderDetails.productName}`,
                    handler: async (response: any) => {
                        const paidOrder: EditableOrder = { ...orderData, paymentStatus: 'Paid' };
                        await saveDocument('orders', paidOrder, paidOrder.id);
                        
                        let recipientEmail = 'customer.service@snazzify.co.in';
                        if (product.sellerId) {
                            const seller = await getDocument<SellerUser>('seller_users', product.sellerId);
                            if (seller?.email) recipientEmail = seller.email;
                        }
                        await fetch('/api/send-notification', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'internal_alert', recipientEmail, subject: `✅ New PREPAID Order from ${name}`, body: `<p>A new prepaid order for ${orderDetails.productName} (₹${totalPrice.toFixed(2)}) has been placed.</p>` })
                        });

                        const card = await createNewShaktiCard(paidOrder);
                        if (card) setNewlyCreatedCard(card);
                        
                        toast({ title: "Payment Successful!", description: `Your payment is confirmed.` });
                        setIsOrderComplete(true);
                    },
                    modal: { 
                        ondismiss: async () => {
                            await saveDocument('leads', orderData, orderData.id);
                            toast({ variant: 'destructive', title: 'Payment Incomplete', description: 'Your order has been saved as a lead. The seller may contact you to complete the purchase.' });
                            setIsSubmitting(false);
                        }
                    },
                    prefill: { name, email, contact }, theme: { color: "#5a31f4" },
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                // ondismiss handles setIsSubmitting(false)
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error', description: error.message });
                setIsSubmitting(false);
            }
        }
    };


    if (isLoadingProduct) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (isOrderComplete) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                 <Card className="w-full max-w-md shadow-lg text-center">
                    <CardHeader>
                         <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>{paymentMethod === 'Cash on Delivery' ? 'Your Order Has Been Placed' : 'Your Order Request Has Been Sent'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{paymentMethod === 'Cash on Delivery' ? 'You will receive a confirmation call or message shortly.' : 'The seller has received your request and will contact you shortly to confirm the order and arrange payment.'}</p>
                         {newlyCreatedCard && (
                            <div className="pt-4 border-t">
                                <h4 className="font-semibold mb-2">Your Shakti Card is Ready!</h4>
                                <div className="flex justify-center">
                                    <ShaktiCard card={newlyCreatedCard} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                     <CardFooter>
                         <a href={returnUrl} className="w-full"><Button className="w-full" variant="outline">Continue Shopping</Button></a>
                    </CardFooter>
                 </Card>
            </div>
        )
    }
    
    if (!product) {
         return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Product Not Available</CardTitle>
                        <CardDescription>The product you are looking for is no longer available or the link is invalid.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                 <form onSubmit={handleSubmit}>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-bold">{product.title}</CardTitle>
                        <CardDescription>Order from {product.sellerName}</CardDescription>
                         {appliedDiscount && (
                            <div className="!mt-4">
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                    <Percent className="mr-1 h-3 w-3"/> Special Offer: {appliedDiscount.discount}% OFF on Secure COD!
                                </Badge>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                             <Image
                                src={product.imageDataUris[0]}
                                alt={product.title}
                                width={500}
                                height={500}
                                className="rounded-lg object-cover w-full aspect-square shadow-md"
                            />
                            <div>
                                <h3 className="font-semibold text-lg">Product Description</h3>
                                <p className="text-muted-foreground text-sm mt-1">{product.description}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg">Your Details</h3>
                                <div className="space-y-4 mt-2">
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
                                         <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" value={customerDetails.email} onChange={e => setCustomerDetails({...customerDetails, email: e.target.value})} className="pl-9" /></div>
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
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Quantity</Label>
                                        <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} min="1"/>
                                    </div>
                                    {availableSizes.length > 0 && (
                                         <div className="space-y-2">
                                            <Label htmlFor="size">Size</Label>
                                            <Select onValueChange={setSelectedSize} value={selectedSize}><SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger><SelectContent>{availableSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    )}
                                     {availableColors.length > 0 && (
                                        <div className="space-y-2">
                                            <Label htmlFor="color">Color</Label>
                                            <Select onValueChange={setSelectedColor} value={selectedColor}><SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger><SelectContent>{availableColors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <Label>Payment Method</Label>
                                    {allowedPaymentMethods.length > 0 ? (
                                        <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} className="grid grid-cols-2 gap-4">
                                            {allowedPaymentMethods.includes('Secure COD') && (
                                                <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Secure COD' && 'border-primary')}>
                                                    <RadioGroupItem value="Secure COD" id="r-scod" className="sr-only"/>
                                                    <span className="font-bold">Secure COD</span>
                                                    <span className={cn("text-sm text-center", appliedDiscount ? 'text-green-600' : 'text-muted-foreground')}>
                                                        {appliedDiscount ? `${appliedDiscount.discount}% discount!` : 'Pay online now, safely.'}
                                                    </span>
                                                </Label>
                                            )}
                                            {allowedPaymentMethods.includes('Cash on Delivery') && (
                                                <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Cash on Delivery' && 'border-primary')}>
                                                    <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only"/>
                                                    <span className="font-bold">Cash on Delivery</span>
                                                    <span className="text-sm text-muted-foreground text-center">Pay cash to the courier.</span>
                                                </Label>
                                            )}
                                            {allowedPaymentMethods.includes('Prepaid') && (
                                                <Label htmlFor="r-prepaid" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Prepaid' && 'border-primary')}>
                                                    <RadioGroupItem value="Prepaid" id="r-prepaid" className="sr-only"/>
                                                    <span className="font-bold">Prepaid</span>
                                                    <span className="text-sm text-muted-foreground text-center">Pay full amount now.</span>
                                                </Label>
                                            )}
                                        </RadioGroup>
                                    ) : (
                                        <div className="p-4 border rounded-md bg-destructive/10 text-destructive text-center">
                                            <p className="font-semibold">No payment methods available.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="text-3xl font-bold flex justify-between items-center pt-2 border-t">
                                    <span>Total:</span>
                                    <div className="text-right">
                                        <span className={cn('transition-colors', appliedDiscount && paymentMethod === 'Secure COD' ? 'text-destructive' : 'text-foreground')}>₹{totalPrice.toFixed(2)}</span>
                                        {appliedDiscount && paymentMethod === 'Secure COD' && <span className="text-sm font-normal text-muted-foreground ml-2 line-through">₹{originalPrice.toFixed(2)}</span>}
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || allowedPaymentMethods.length === 0}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                            Place Order Request
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

export default function CataloguePage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CatalogueOrderPageContent />
        </Suspense>
    );
}
