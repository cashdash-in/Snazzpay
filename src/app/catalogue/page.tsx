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
import type { EditableOrder } from '@/app/orders/page';
import { v4 as uuidv4 } from 'uuid';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import type { ProductDrop } from '../vendor/product-drops/page';
import type { SellerUser } from '../seller-accounts/page';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type DisplayProduct = (SellerProduct | ProductDrop) & { 
    price: number; 
    sellerName: string; 
    sellerId: string;
    productId: string;
    vendor: string;
    collection: string;
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


function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<DisplayProduct | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);

    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Secure Charge on Delivery' | 'Cash on Delivery'>('Secure Charge on Delivery');
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrderComplete, setIsOrderComplete] = useState(false);
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [originalPrice, setOriginalPrice] = useState(0);
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
    
    const availableSizes = searchParams.get('sizes')?.split(',').filter(s => s) || [];
    const availableColors = searchParams.get('colors')?.split(',').filter(c => c) || [];

    useEffect(() => {
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
        async function fetchProduct() {
            const productId = searchParams.get('id');
            const discountParam = searchParams.get('discount');
            
            if (!productId) {
                setIsLoadingProduct(false);
                toast({ variant: 'destructive', title: "Product not found", description: "The product ID is missing from the link." });
                return;
            }

            try {
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
                        sellerName: (fetchedProduct as SellerProduct).sellerName ?? (fetchedProduct as ProductDrop).vendorName,
                        sellerId: (fetchedProduct as SellerProduct).sellerId ?? (fetchedProduct as ProductDrop).vendorId,
                        productId: fetchedProduct.id,
                        vendor: productType === 'product_drop' ? (fetchedProduct as ProductDrop).vendorName : ((fetchedProduct as SellerProduct).sellerName || ''),
                        collection: (fetchedProduct as any).category || '',
                    };
                    setProduct(displayProduct);

                    let bestDiscount: DiscountRule | null = null;
                    if(discountParam && parseFloat(discountParam) > 0) {
                        bestDiscount = { id: 'link_discount', type: 'collection', name: 'Special Offer', discount: parseFloat(discountParam) };
                    } else {
                        const discounts = await getCollection<DiscountRule>('discounts');
                        const productDiscount = discounts.find(d => d.id === \`product_\${displayProduct.productId}\`);
                        const vendorDiscount = discounts.find(d => d.id === \`vendor_\${displayProduct.vendor}\`);
                        const collectionDiscount = discounts.find(d => d.id === \`collection_\${displayProduct.collection}\`);
                        bestDiscount = productDiscount || vendorDiscount || collectionDiscount || null;
                    }

                    setAppliedDiscount(bestDiscount);

                    if (availableSizes.length > 0) setSelectedSize(availableSizes[0]);
                    if (availableColors.length > 0) setSelectedColor(availableColors[0]);
                } else {
                    toast({ variant: 'destructive', title: "Product not found", description: "We couldn't find details for this product." });
                }
            } catch (e) {
                console.error("Error fetching product:", e);
                toast({ variant: 'destructive', title: "Error", description: "There was a problem loading the product." });
            } finally {
                setIsLoadingProduct(false);
            }
        }
        fetchProduct();
    }, [searchParams, toast]);

    useEffect(() => {
        if (product) {
            const baseTotal = ((product as SellerProduct).price || (product as ProductDrop).costPrice) * quantity;
            setOriginalPrice(baseTotal);
            
            if (appliedDiscount && paymentMethod === 'Secure Charge on Delivery') {
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

        const { name, contact, address, pincode } = customerDetails;
        
        if (!name || !contact || !address || !pincode) {
            toast({ variant: 'destructive', title: "Missing Details", description: "Please fill out your name, contact, address, and pincode." });
            return;
        }

        setIsSubmitting(true);
        const leadId = uuidv4();

        const finalDiscountAmount = (paymentMethod === 'Secure Charge on Delivery' && appliedDiscount) ? originalPrice - totalPrice : undefined;

        const newLead: EditableOrder = {
            id: leadId,
            orderId: \`#SMRT-\${Math.floor(1000 + Math.random() * 9000)}\`,
            customerName: name,
            customerEmail: customerDetails.email,
            customerAddress: address,
            pincode,
            contactNo: contact,
            productOrdered: product.title,
            quantity,
            size: selectedSize,
            color: selectedColor,
            price: totalPrice.toString(),
            originalPrice: originalPrice.toString(),
            discountPercentage: paymentMethod === 'Secure Charge on Delivery' ? appliedDiscount?.discount : undefined,
            discountAmount: finalDiscountAmount,
            date: new Date().toISOString(),
            paymentStatus: 'Lead',
            paymentMethod,
            source: 'Catalogue',
            sellerId: product.sellerId,
            sellerName: product.sellerName,
            isRead: false,
            imageDataUris: product.imageDataUris,
        };

        try {
            await saveDocument('leads', newLead, leadId);
            toast({
                title: 'Order Request Sent!',
                description: \`The seller, \${product.sellerName}, has received your request and will contact you shortly to confirm.\`,
            });
            
            let recipientEmail = 'customer.service@snazzify.co.in'; // Admin fallback
            if (product.sellerId) {
                const seller = await getDocument<SellerUser>('seller_users', product.sellerId);
                if (seller?.email) {
                    recipientEmail = seller.email;
                }
            }
            
            await fetch('/api/send-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'internal_alert',
                    recipientEmail: recipientEmail,
                    subject: \`New Lead from \${name} for \${product.title}\`,
                    body: \`
                        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                            <h2>New Lead Alert!</h2>
                            <p>You have a new order request from your Smart Magazine.</p>
                            <ul>
                                <li><strong>Customer:</strong> \${name}</li>
                                <li><strong>Product:</strong> \${product.title}</li>
                                <li><strong>Value:</strong> ₹\${totalPrice.toFixed(2)}</li>
                            </ul>
                            <p>Please log in to your dashboard to view the lead and take action.</p>
                        </div>
                    \`
                })
            });

            setIsOrderComplete(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
            setIsSubmitting(false);
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
                        <CardDescription>Your Order Request Has Been Sent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">The seller has received your request and will contact you shortly via WhatsApp or phone to confirm the order and arrange payment.</p>
                    </CardContent>
                     <CardFooter>
                         <a href="https://www.snazzify.co.in" className="w-full"><Button className="w-full" variant="outline">Continue Shopping</Button></a>
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
                                    <RadioGroup value={paymentMethod} onValueChange={(value: 'Secure Charge on Delivery' | 'Cash on Delivery') => setPaymentMethod(value)} className="grid grid-cols-2 gap-4">
                                        <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Secure Charge on Delivery' && 'border-primary')}>
                                            <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only"/>
                                            <span className="font-bold">Secure COD</span>
                                            <span className={cn("text-sm text-center", appliedDiscount ? 'text-green-600' : 'text-muted-foreground')}>
                                                {appliedDiscount ? \`\${appliedDiscount.discount}% discount!\` : 'Pay online now, safely.'}
                                            </span>
                                        </Label>
                                        <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center rounded-md border-2 p-4 cursor-pointer", paymentMethod === 'Cash on Delivery' && 'border-primary')}>
                                            <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only"/>
                                            <span className="font-bold">Cash on Delivery</span>
                                            <span className="text-sm text-muted-foreground text-center">Pay cash to the courier.</span>
                                        </Label>
                                    </RadioGroup>
                                </div>
                                <div className="text-3xl font-bold flex justify-between items-center pt-2 border-t">
                                    <span>Total:</span>
                                    <div className="text-right">
                                        <span className={cn('transition-colors', appliedDiscount && paymentMethod === 'Secure Charge on Delivery' ? 'text-destructive' : 'text-foreground')}>₹{totalPrice.toFixed(2)}</span>
                                        {appliedDiscount && paymentMethod === 'Secure Charge on Delivery' && <span className="text-sm font-normal text-muted-foreground ml-2 line-through">₹{originalPrice.toFixed(2)}</span>}
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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
