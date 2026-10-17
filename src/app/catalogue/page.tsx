
'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShoppingCart, User, Phone, Mail as MailIcon, Home, MapPin, CheckCircle, Percent, Sparkles, Camera, ImagePlus, RefreshCcw, Download, MessageSquare, Share2, ArrowLeft, Store, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { saveDocument, getDocument, getCollection } from '@/services/firestore';
import type { EditableOrder } from '@/types/order';
import { v4 as uuidv4 } from 'uuid';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { virtualTryOn } from '@/ai/flows/virtual-try-on';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { PaymentMethod } from '@/types/product';

type DisplayProduct = any & { 
    price: number; 
    sellerName: string; 
    sellerId: string;
    productId: string;
    vendor: string;
    collection: string;
    allowedPaymentMethods?: PaymentMethod[];
    isEastIndianLugra?: boolean;
    isTryOnEnabled?: boolean;
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

const MAX_TRYON_SIZE_PX = 448;

function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<DisplayProduct | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [sellerLogo, setSellerLogo] = useState<string | null>(null);

    // Try-On State
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [hasConsented, setHasConsented] = useState(false);
    const [selectedDrapeStyle, setSelectedDrapeStyle] = useState<'Standard Saree' | 'East Indian Lugra' | 'Western Wear' | 'Western Dress' | 'Kurti'>('Western Wear');
    const [selectedSleeves, setSelectedSleeves] = useState<'Half Sleeves' | 'Full Sleeves' | 'Sleeveless'>('Half Sleeves');
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
        name: '', email: '', contact: '', address: '', pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState<'Secure Charge on Delivery' | 'Cash on Delivery' | 'Prepaid'>('Secure Charge on Delivery');
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOrderComplete, setIsOrderComplete] = useState(false);
    
    const [totalPrice, setTotalPrice] = useState(0);
    const [appliedDiscount, setAppliedDiscount] = useState<DiscountRule | null>(null);
    const [returnUrl, setReturnUrl] = useState('https://www.snazzify.co.in');

    const ctx = useMemo(() => {
        if (!product) return { type: 'Fabric', hint: 'selfie', label: 'SELFIE' };
        const title = product.title.toLowerCase();
        const cat = (product.category || '').toLowerCase();
        
        const isWatch = title.includes('watch') || cat.includes('watch');
        const isFootwear = title.includes('shoe') || cat.includes('shoe') || title.includes('sandal') || cat.includes('sandal') || title.includes('sneaker') || cat.includes('sneaker') || title.includes('footwear') || cat.includes('footwear') || (title.includes('frock') === false && title.includes('heel')) || cat.includes('footwear');
        const isEyewear = title.includes('glass') || cat.includes('glass') || title.includes('shade') || cat.includes('shade') || title.includes('spectacle') || cat.includes('spectacle');
        const isShirt = (title.includes('shirt') || title.includes('t-shirt') || cat.includes('shirt')) && !title.includes('dress');
        const isDress = title.includes('dress') || title.includes('frock') || cat.includes('dress') || cat.includes('frock');
        const isKurti = title.includes('kurti') || title.includes('kurta') || cat.includes('kurti') || cat.includes('kurta');

        if (isWatch) return { type: 'Accessory', hint: 'wrist', label: 'WRIST' };
        if (isFootwear) return { type: 'Footwear', hint: 'feet', label: 'FEET' };
        if (isEyewear) return { type: 'Eyewear', hint: 'face', label: 'FACE' };
        if (isShirt) return { type: 'Shirt', hint: 'selfie', label: 'SELFIE' };
        if (isDress) return { type: 'Dress', hint: 'selfie', label: 'SELFIE' };
        if (isKurti) return { type: 'Kurti', hint: 'selfie', label: 'SELFIE' };
        
        return { type: 'Fabric', hint: 'selfie', label: 'SELFIE' };
    }, [product]);

    const isShirt = ctx.type === 'Shirt';
    const isApparel = ctx.type === 'Fabric' || ctx.type === 'Shirt' || ctx.type === 'Dress' || ctx.type === 'Kurti';

    useEffect(() => {
        setMounted(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        const productId = searchParams.get('id');
        const urlSellerId = searchParams.get('sellerId');
        const backUrl = searchParams.get('return_url');
        if (backUrl) setReturnUrl(backUrl);
        
        async function loadProduct() {
            if (!productId) {
                setIsLoadingProduct(false);
                return;
            }

            try {
                if (urlSellerId) {
                    const sellerData = await getDocument<any>('seller_users', urlSellerId);
                    if (sellerData?.logoDataUri) {
                        setSellerLogo(sellerData.logoDataUri);
                    } else {
                        const vendorData = await getDocument<any>('vendors', urlSellerId);
                        if (vendorData?.logoDataUri) {
                            setSellerLogo(vendorData.logoDataUri);
                        }
                    }
                }

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
                    
                    if (displayProduct.allowedPaymentMethods?.includes('Secure COD')) setPaymentMethod('Secure Charge on Delivery');
                    else if (displayProduct.allowedPaymentMethods?.includes('Prepaid')) setPaymentMethod('Prepaid');
                    else if (displayProduct.allowedPaymentMethods?.includes('Cash on Delivery')) setPaymentMethod('Cash on Delivery');

                    if (displayProduct.isEastIndianLugra) setSelectedDrapeStyle('East Indian Lugra');
                    else if (ctx.type === 'Shirt') setSelectedDrapeStyle('Western Wear');
                    else if (ctx.type === 'Dress') setSelectedDrapeStyle('Western Dress');
                    else if (ctx.type === 'Kurti') setSelectedDrapeStyle('Kurti');

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
    }, [searchParams, ctx.type]);

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

    const resizeImageForAI = (fileOrUri: File | string, maxSize: number = MAX_TRYON_SIZE_PX): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') return reject('Window undefined');
            const img = new (window as any).Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
                else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.onerror = reject;
            if (typeof fileOrUri === 'string') img.src = fileOrUri;
            else {
                const reader = new FileReader();
                reader.onload = (e) => img.src = e.target?.result as string;
                reader.readAsDataURL(fileOrUri);
            }
        });
    };

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasConsented) {
            toast({ variant: 'destructive', title: "Consent Required" });
            return;
        }
        const file = e.target.files?.[0];
        if (!file || !product) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        try {
            const [personUri, productUri] = await Promise.all([
                resizeImageForAI(file),
                resizeImageForAI(product.imageDataUris[0])
            ]);
            
            const result = await virtualTryOn({
                personImageDataUri: personUri,
                productImageDataUri: productUri,
                productTitle: product.title,
                garmentType: ctx.type as any,
                drapeStyle: selectedDrapeStyle,
                sleeveLength: selectedSleeves
            });
            
            setTryOnResult(result.generatedImageDataUri);
            toast({ title: "Magic Mirror Ready!" });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err.message });
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleShareWhatsApp = () => {
        if (!tryOnResult) return;
        const message = `Check out my new virtual look with this ${product?.title} from Snazzify! ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setIsSubmitting(true);
        
        try {
            const orderId = '#SMRT-' + Math.floor(1000 + Math.random() * 9000);
            const orderData: EditableOrder = {
                id: uuidv4(), orderId, productId: product.productId, customerName: customerDetails.name, contactNo: customerDetails.contact, customerAddress: customerDetails.address, pincode: customerDetails.pincode, productOrdered: product.title, quantity, price: totalPrice.toString(), date: new Date().toISOString(), paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : (paymentMethod === 'Prepaid' ? 'Pending Payment' : 'Lead'), paymentMethod, source: 'Catalogue', sellerId: product.sellerId, sellerName: product.sellerName, imageDataUris: product.imageDataUris,
            };
            
            await saveDocument('leads', orderData, orderData.id);
            
            if (paymentMethod === 'Prepaid') {
                 router.push(`/payment?amount=${totalPrice}&name=${encodeURIComponent(product.title)}&order_id=${orderData.id}&return_url=${encodeURIComponent(returnUrl)}&prepaid=true`);
                 return;
            }

            if (paymentMethod === 'Secure Charge on Delivery') {
                router.push(`/secure-cod?order_id=${orderData.id}&return_url=${encodeURIComponent(returnUrl)}`);
                return;
            }

            setIsOrderComplete(true);
        } catch (err) {
            toast({ variant: 'destructive', title: "Order Failed" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || isLoadingProduct) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

    const allowedMethods = product?.allowedPaymentMethods || ['Secure COD', 'Cash on Delivery', 'Prepaid'];

    return (
        <div className="min-h-screen bg-slate-50">
             <header className="bg-white border-b sticky top-0 z-40 px-4 py-3 md:px-8 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {sellerLogo ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border bg-white shadow-sm">
                            <Image src={sellerLogo} alt="Store Logo" fill className="object-contain p-1" unoptimized />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Store className="h-6 w-6" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">{product?.sellerName || 'Snazzify Store'}</h1>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5 flex items-center gap-1">
                           <ShieldCheck className="h-2 w-2" /> Verified Partner
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-full border">
                    <ArrowLeft className="mr-1 h-3 w-3" /> Back
                </Button>
            </header>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 md:p-8">
                <div className="space-y-6">
                    <Card className="rounded-[32px] overflow-hidden shadow-xl border-none bg-white relative">
                        {product?.isTryOnEnabled && !tryOnResult && (
                            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                                <Badge className="bg-primary/90 text-white font-black italic text-xs py-1.5 px-4 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                                    <Sparkles className="h-3 w-3" /> TRY ME
                                </Badge>
                            </div>
                        )}
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
                                    <p className="text-sm text-muted-foreground animate-pulse max-w-xs">Crafting your perfect virtual look on your {ctx.hint}.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {product?.isTryOnEnabled && (
                        <Card className="rounded-[24px] bg-slate-900 text-white p-6 shadow-2xl overflow-hidden relative border-none">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-20 w-20" /></div>
                            <div className="flex flex-col gap-6 relative z-10">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" /> Magic Mirror</h3>
                                    <p className="text-xs text-slate-400">Instantly see how it looks on your {ctx.hint}.</p>
                                </div>
                                
                                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            id="privacy-consent" 
                                            checked={hasConsented} 
                                            onCheckedChange={(val) => setHasConsented(val as boolean)}
                                            className="mt-1 border-white/50"
                                        />
                                        <Label htmlFor="privacy-consent" className="text-[10px] font-medium leading-relaxed text-slate-300">
                                            <span className="font-bold text-white uppercase block mb-1">Privacy Promise</span>
                                            We do not save any pics to our server. Your photo is processed instantly and removed immediately after this session.
                                        </Label>
                                    </div>

                                    {isApparel && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                            {!isShirt && (
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Style Mode</Label>
                                                    <Select value={selectedDrapeStyle} onValueChange={(val: any) => setSelectedDrapeStyle(val)}>
                                                        <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white rounded-xl text-xs font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Western Wear">Western Fit (Mini/Tight Fit)</SelectItem>
                                                            <SelectItem value="Western Dress">Modern Western Dress</SelectItem>
                                                            <SelectItem value="Kurti">Traditional Kurti</SelectItem>
                                                            <SelectItem value="Standard Saree">Standard Saree (Floor Length)</SelectItem>
                                                            <SelectItem value="East Indian Lugra">East Indian Lugra (Authentic)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            
                                            {isShirt && (
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fit Mode</Label>
                                                    <div className="h-10 px-3 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-bold flex items-center">
                                                        Standard Fitting
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sleeves</Label>
                                                <Select value={selectedSleeves} onValueChange={(val: any) => setSelectedSleeves(val)}>
                                                    <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white rounded-xl text-xs font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Half Sleeves">Half Sleeves</SelectItem>
                                                        <SelectItem value="Full Sleeves">Full Sleeves</SelectItem>
                                                        <SelectItem value="Sleeveless">Sleeveless</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {tryOnResult ? (
                                            <div className="col-span-full space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button onClick={() => setTryOnResult(null)} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 rounded-xl h-12 font-bold"><RefreshCcw className="mr-2 h-4 w-4" /> Try Again</Button>
                                                    <Button onClick={() => {
                                                        const link = document.createElement('a');
                                                        link.href = tryOnResult;
                                                        link.download = `my_look_${product?.id}.jpg`;
                                                        link.click();
                                                    }} className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-12 font-bold"><Download className="mr-2 h-4 w-4" /> Save Look</Button>
                                                </div>
                                                <Button onClick={handleShareWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-bold">
                                                    <MessageSquare className="mr-2 h-5 w-5" /> Share on WhatsApp Status
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button 
                                                    onClick={() => cameraInputRef.current?.click()} 
                                                    disabled={!hasConsented || isTryOnLoading}
                                                    className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg disabled:opacity-50"
                                                >
                                                    <Camera className="mr-2 h-4 w-4" /> Take {ctx.label}
                                                </Button>
                                                <Button 
                                                    onClick={() => galleryInputRef.current?.click()} 
                                                    disabled={!hasConsented || isTryOnLoading}
                                                    variant="secondary" 
                                                    className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-xl h-12 font-bold disabled:opacity-50"
                                                >
                                                    <ImagePlus className="mr-2 h-4 w-4" /> From Gallery
                                                </Button>
                                            </>
                                        )}
                                        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleTryOnUpload} />
                                        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleTryOnUpload} />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

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
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Full Name</Label><Input required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp Mobile</Label><Input required type="tel" value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Delivery Address</Label><Input required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pincode</Label><Input required value={customerDetails.pincode} onChange={e => setCustomerDetails({...customerDetails, pincode: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Payment</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {allowedMethods.includes('Secure COD') && (
                                        <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center p-4 border-4 rounded-2xl cursor-pointer transition-all gap-1", paymentMethod === 'Secure Charge on Delivery' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                                            <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only" />
                                            <ShieldCheck className={cn("h-6 w-6", paymentMethod === 'Secure Charge on Delivery' ? "text-primary" : "text-slate-300")} />
                                            <span className="font-black text-[10px] uppercase italic">Secure COD</span>
                                        </Label>
                                    )}
                                    {allowedMethods.includes('Prepaid') && (
                                        <Label htmlFor="r-prepaid" className={cn("flex flex-col items-center justify-center p-4 border-4 rounded-2xl cursor-pointer transition-all gap-1", paymentMethod === 'Prepaid' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                                            <RadioGroupItem value="Prepaid" id="r-prepaid" className="sr-only" />
                                            <CreditCard className={cn("h-6 w-6", paymentMethod === 'Prepaid' ? "text-primary" : "text-slate-300")} />
                                            <span className="font-black text-[10px] uppercase italic">Online Payment</span>
                                        </Label>
                                    )}
                                    {allowedMethods.includes('Cash on Delivery') && (
                                        <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center p-4 border-4 rounded-2xl cursor-pointer transition-all gap-1", paymentMethod === 'Cash on Delivery' ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}>
                                            <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only" />
                                            <ShoppingCart className={cn("h-6 w-6", paymentMethod === 'Cash on Delivery' ? "text-primary" : "text-slate-300")} />
                                            <span className="font-black text-[10px] uppercase italic">Standard COD</span>
                                        </Label>
                                    )}
                                </RadioGroup>
                            </div>
                            <Button type="submit" size="lg" className="w-full h-16 text-xl font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirm Order"}</Button>
                        </form>
                    </Card>
                </div>
            </div>
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
