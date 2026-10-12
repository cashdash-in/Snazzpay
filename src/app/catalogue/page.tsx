'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShoppingCart, User, Phone, Mail as MailIcon, Home, MapPin, CheckCircle, Percent, Sparkles, Camera, ImagePlus, RefreshCcw } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { saveDocument, getDocument, getCollection } from '@/services/firestore';
import type { EditableOrder } from '../orders/page';
import { v4 as uuidv4 } from 'uuid';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import type { ProductDrop } from '../vendor/product-drops/page';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format, addYears } from 'date-fns';
import { ShaktiCard, ShaktiCardData } from '@/components/shakti-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { virtualTryOn } from '@/ai/flows/virtual-try-on';

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

const MAX_TRYON_SIZE_PX = 512; // Optimized for reliability and server limits

function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<DisplayProduct | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Try-On State
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

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
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
    const [returnUrl, setReturnUrl] = useState('https://www.snazzify.co.in');

    useEffect(() => {
        setMounted(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        const productId = searchParams.get('id');
        const urlSellerId = searchParams.get('sellerId');
        
        async function loadProduct() {
            if (!productId) {
                setIsLoadingProduct(false);
                return;
            }

            try {
                let fetchedProduct: any = await getDocument('seller_products', productId);
                if (!fetchedProduct) fetchedProduct = await getDocument('product_drops', productId);

                if (fetchedProduct) {
                    const price = fetchedProduct.price ?? fetchedProduct.costPrice;
                    const displayProduct: DisplayProduct = {
                        ...fetchedProduct,
                        price: price,
                        sellerName: searchParams.get('sellerName') || fetchedProduct.sellerName || fetchedProduct.vendorName || 'Snazzify',
                        sellerId: urlSellerId || fetchedProduct.sellerId || fetchedProduct.vendorId || 'admin',
                        productId: fetchedProduct.id,
                        vendor: fetchedProduct.vendorName || fetchedProduct.sellerName || '',
                        collection: fetchedProduct.category || '',
                    };
                    setProduct(displayProduct);
                    
                    const discounts = await getCollection<DiscountRule>('discounts');
                    const best = discounts.find(d => d.id === `product_${productId}` || d.id === `vendor_${displayProduct.vendor}`) || null;
                    setAppliedDiscount(best);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingProduct(false);
            }
        }
        loadProduct();
    }, [searchParams]);

    useEffect(() => {
        if (product) {
            const base = product.price * quantity;
            if (appliedDiscount && paymentMethod === 'Secure Charge on Delivery') {
                setTotalPrice(base - (base * (appliedDiscount.discount / 100)));
            } else {
                setTotalPrice(base);
            }
        }
    }, [quantity, product, paymentMethod, appliedDiscount]);

    const resizeImage = (fileOrUri: File | string, maxSize: number = MAX_TRYON_SIZE_PX): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new (window as any).Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) {
                    if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                } else {
                    if (height > maxSize) { width *= maxSize / height; height = maxSize; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
            if (typeof fileOrUri === 'string') {
                img.src = fileOrUri;
            } else {
                const reader = new FileReader();
                reader.onload = (e) => img.src = e.target?.result as string;
                reader.onerror = reject;
                reader.readAsDataURL(fileOrUri);
            }
        });
    };

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !product) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        try {
            // Resize User Selfie and Product Image to ensure payload < 1MB
            const [personUri, productUri] = await Promise.all([
                resizeImage(file),
                resizeImage(product.imageDataUris[0])
            ]);
            
            const result = await virtualTryOn({
                personImageDataUri: personUri,
                productImageDataUri: productUri,
                productTitle: product.title,
            });
            
            setTryOnResult(result.generatedImageDataUri);
            toast({ title: "Magic Mirror Ready!", description: "AI has virtually dressed you in this item." });
        } catch (err: any) {
            console.error("Try-On Error:", err);
            toast({ variant: 'destructive', title: "Try-On Failed", description: "AI encountered an issue. Please try a clearer photo." });
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setIsSubmitting(true);
        
        try {
            const orderId = '#SMRT-' + Math.floor(1000 + Math.random() * 9000);
            const orderData: EditableOrder = {
                id: uuidv4(),
                orderId,
                productId: product.productId,
                customerName: customerDetails.name,
                contactNo: customerDetails.contact,
                customerAddress: customerDetails.address,
                pincode: customerDetails.pincode,
                productOrdered: product.title,
                quantity,
                price: totalPrice.toString(),
                date: new Date().toISOString(),
                paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Lead',
                paymentMethod,
                source: 'Catalogue',
                sellerId: product.sellerId,
                sellerName: product.sellerName,
                imageDataUris: product.imageDataUris,
            };
            await saveDocument('orders', orderData, orderData.id);
            setIsOrderComplete(true);
        } catch (err) {
            toast({ variant: 'destructive', title: "Order Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || isLoadingProduct) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Product & Magic Mirror */}
                <div className="space-y-6">
                    <Card className="rounded-[32px] overflow-hidden shadow-xl border-none bg-white">
                        <div className="relative aspect-square">
                            {tryOnResult ? (
                                <Image src={tryOnResult} fill alt="Try-On Result" className="object-cover animate-in fade-in zoom-in-95 duration-500" unoptimized />
                            ) : (
                                <Carousel className="w-full h-full">
                                    <CarouselContent>
                                        {product?.imageDataUris.map((uri, i) => (
                                            <CarouselItem key={i}><div className="relative aspect-square"><Image src={uri} fill alt="product" className="object-cover" unoptimized /></div></CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {product && product.imageDataUris.length > 1 && <><CarouselPrevious className="left-4" /><CarouselNext className="right-4" /></>}
                                </Carousel>
                            )}
                            {isTryOnLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 gap-4 z-20">
                                    <Sparkles className="h-16 w-16 text-primary animate-bounce" />
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">AI Fitting Room...</h3>
                                    <p className="text-sm text-muted-foreground animate-pulse max-w-xs">We are virtually dressing you in this item. This takes about 20 seconds.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="rounded-[24px] bg-slate-900 text-white p-6 shadow-2xl overflow-hidden relative border-none">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles className="h-20 w-20" />
                        </div>
                        <div className="flex flex-col gap-6 relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-400" /> Magic Mirror
                                </h3>
                                <p className="text-xs text-slate-400">See how this outfit looks on you instantly with AI.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {tryOnResult ? (
                                    <Button onClick={() => setTryOnResult(null)} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12 font-bold">
                                        <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                                    </Button>
                                ) : (
                                    <>
                                        <Button onClick={() => cameraInputRef.current?.click()} className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg">
                                            <Camera className="mr-2 h-4 w-4" /> Take a Selfie
                                        </Button>
                                        <Button onClick={() => galleryInputRef.current?.click()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl h-12 font-bold">
                                            <ImagePlus className="mr-2 h-4 w-4" /> From Gallery
                                        </Button>
                                    </>
                                )}
                                <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleTryOnUpload} />
                                <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleTryOnUpload} />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right: Checkout Form */}
                <div className="space-y-6">
                    <Card className="rounded-[32px] shadow-xl border-none p-6 md:p-10 bg-white">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">{product?.title}</h2>
                                <div className="flex items-center gap-3 mt-4">
                                    <p className="text-primary font-black text-3xl tracking-tighter">₹{totalPrice.toFixed(2)}</p>
                                    {appliedDiscount && paymentMethod === 'Secure Charge on Delivery' && (
                                        <Badge className="bg-destructive text-white font-black italic">-{appliedDiscount.discount}% OFF</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</Label>
                                    <Input required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp Mobile</Label>
                                    <Input required type="tel" value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Delivery Address</Label>
                                    <Input required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Payment</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-4">
                                    <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center p-4 border-4 rounded-2xl cursor-pointer transition-all gap-1", paymentMethod === 'Secure Charge on Delivery' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                                        <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only" />
                                        <ShieldCheck className={cn("h-6 w-6", paymentMethod === 'Secure Charge on Delivery' ? "text-primary" : "text-slate-300")} />
                                        <span className="font-black text-[10px] uppercase italic">Secure COD</span>
                                    </Label>
                                    <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center p-4 border-4 rounded-2xl cursor-pointer transition-all gap-1", paymentMethod === 'Cash on Delivery' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                                        <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only" />
                                        <ShoppingCart className={cn("h-6 w-6", paymentMethod === 'Cash on Delivery' ? "text-primary" : "text-slate-300")} />
                                        <span className="font-black text-[10px] uppercase italic">Standard COD</span>
                                    </Label>
                                </RadioGroup>
                            </div>

                            <Button type="submit" size="lg" className="w-full h-16 text-xl font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirm Order"}
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>

            {/* Complete Screen */}
            {isOrderComplete && (
                <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-300">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner"><CheckCircle className="h-14 w-14" /></div>
                    <div className="space-y-2">
                        <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Order Received!</h2>
                        <p className="text-muted-foreground max-w-sm mx-auto font-medium">Thank you for shopping. Our team will contact you on WhatsApp to finalize fulfillment.</p>
                    </div>
                    <Button onClick={() => window.location.href = returnUrl} size="lg" className="rounded-2xl px-12 h-14 font-black uppercase italic tracking-widest">Back to Store</Button>
                </div>
            )}
        </div>
    );
}

export default function CataloguePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}><CatalogueOrderPageContent /></Suspense>;
}
