
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShoppingCart, User, Phone, Mail as MailIcon, Home, MapPin, CheckCircle, Percent, Sparkles, Camera, Download, Share2 } from 'lucide-react';
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

const MAX_TRYON_SIZE_PX = 800;

function CatalogueOrderPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const [product, setProduct] = useState<DisplayProduct | null>(null);
    const [isLoadingProduct, setIsLoadingProduct] = useState(true);
    const [sellerLogo, setSellerLogo] = useState<string | null>(null);

    // Try-On State
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [userPhotoUri, setUserPhotoUri] = useState<string | null>(null);

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
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);
    const [newlyCreatedCard, setNewlyCreatedCard] = useState<ShaktiCardData | null>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        fetch('/api/get-key').then(res => res.json()).then(data => setRazorpayKeyId(data.keyId));
    }, []);

    useEffect(() => {
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
                        sellerName: searchParams.get('sellerName') || fetchedProduct.sellerName || fetchedProduct.vendorName,
                        sellerId: urlSellerId || fetchedProduct.sellerId || fetchedProduct.vendorId,
                        productId: fetchedProduct.id,
                        vendor: fetchedProduct.vendorName || fetchedProduct.sellerName || '',
                        collection: fetchedProduct.category || '',
                    };
                    setProduct(displayProduct);
                    setAvailableSizes(fetchedProduct.sizes || []);
                    setAvailableColors(fetchedProduct.colors || []);
                    
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
            setOriginalPrice(base);
            if (appliedDiscount && paymentMethod === 'Secure COD') {
                setTotalPrice(base - (base * (appliedDiscount.discount / 100)));
            } else {
                setTotalPrice(base);
            }
        }
    }, [quantity, product, paymentMethod, appliedDiscount]);

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new (window as any).Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_TRYON_SIZE_PX) { height *= MAX_TRYON_SIZE_PX / width; width = MAX_TRYON_SIZE_PX; }
                    } else {
                        if (height > MAX_TRYON_SIZE_PX) { width *= MAX_TRYON_SIZE_PX / height; height = MAX_TRYON_SIZE_PX; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !product) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        try {
            const personUri = await resizeImage(file);
            setUserPhotoUri(personUri);
            
            const productUri = product.imageDataUris[0];
            const result = await virtualTryOn({
                personImageDataUri: personUri,
                productImageDataUri: productUri,
                productTitle: product.title,
            });
            
            setTryOnResult(result.generatedImageDataUri);
            toast({ title: "Magic Mirror Ready!", description: "AI has virtually dressed you in this item." });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err.message });
        } finally {
            setIsTryOnLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setIsSubmitting(true);
        // ... (Order submission logic matches existing flow)
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
        setIsSubmitting(false);
    };

    if (isLoadingProduct) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Product & Magic Mirror */}
                <div className="space-y-6">
                    <Card className="rounded-[32px] overflow-hidden shadow-xl border-none">
                        <div className="relative aspect-square bg-white">
                            {tryOnResult ? (
                                <Image src={tryOnResult} fill alt="Result" className="object-cover animate-in fade-in zoom-in-95 duration-500" unoptimized />
                            ) : (
                                <Carousel className="w-full h-full">
                                    <CarouselContent>
                                        {product?.imageDataUris.map((uri, i) => (
                                            <CarouselItem key={i}><div className="relative aspect-square"><Image src={uri} fill alt="p" className="object-cover" unoptimized /></div></CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {product && product.imageDataUris.length > 1 && <><CarouselPrevious className="left-4" /><CarouselNext className="right-4" /></>}
                                </Carousel>
                            )}
                            {isTryOnLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 gap-4">
                                    <Sparkles className="h-12 w-12 text-primary animate-bounce" />
                                    <h3 className="text-xl font-black italic uppercase">AI Fitting Room...</h3>
                                    <p className="text-sm text-muted-foreground animate-pulse">Our AI is virtually dressing you. This takes about 20-30 seconds.</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="rounded-[24px] bg-primary/5 border-2 border-dashed border-primary/20 p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-1 text-center md:text-left">
                                <h3 className="text-lg font-black italic uppercase flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary" /> Magic Mirror
                                </h3>
                                <p className="text-xs text-muted-foreground">Upload your photo to virtually try this item.</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                {tryOnResult ? (
                                    <Button onClick={() => setTryOnResult(null)} variant="outline" className="flex-1 md:flex-none">Reset</Button>
                                ) : (
                                    <Button onClick={() => document.getElementById('tryon-upload')?.click()} className="flex-1 md:flex-none shadow-lg">
                                        <Camera className="mr-2 h-4 w-4" /> Try It On
                                    </Button>
                                )}
                                <input id="tryon-upload" type="file" accept="image/*" className="hidden" onChange={handleTryOnUpload} />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right: Checkout Form */}
                <div className="space-y-6">
                    <Card className="rounded-[32px] shadow-xl border-none p-6 md:p-10">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{product?.title}</h2>
                                <p className="text-primary font-bold text-xl mt-2">₹{totalPrice.toFixed(2)}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Full Name</Label>
                                    <Input required value={customerDetails.name} onChange={e => setCustomerDetails({...customerDetails, name: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">WhatsApp Mobile</Label>
                                    <Input required type="tel" value={customerDetails.contact} onChange={e => setCustomerDetails({...customerDetails, contact: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Delivery Address</Label>
                                    <Input required value={customerDetails.address} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} className="h-12 rounded-xl" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Select Payment</Label>
                                <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="grid grid-cols-2 gap-4">
                                    <Label htmlFor="r-scod" className={cn("flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all", paymentMethod === 'Secure Charge on Delivery' ? "border-primary bg-primary/5" : "hover:border-slate-300")}>
                                        <RadioGroupItem value="Secure Charge on Delivery" id="r-scod" className="sr-only" />
                                        <ShieldCheck className="h-5 w-5 mb-1" />
                                        <span className="font-bold text-xs">SECURE COD</span>
                                    </Label>
                                    <Label htmlFor="r-cod" className={cn("flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all", paymentMethod === 'Cash on Delivery' ? "border-primary bg-primary/5" : "hover:border-slate-300")}>
                                        <RadioGroupItem value="Cash on Delivery" id="r-cod" className="sr-only" />
                                        <ShoppingCart className="h-5 w-5 mb-1" />
                                        <span className="font-bold text-xs">Standard COD</span>
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
                <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle className="h-12 w-12" /></div>
                    <h2 className="text-4xl font-black italic uppercase">Thank You!</h2>
                    <p className="text-muted-foreground max-w-sm">Your order has been received. We'll contact you on WhatsApp shortly.</p>
                    <Button onClick={() => window.location.href = returnUrl} size="lg" className="rounded-2xl px-12">Continue Shopping</Button>
                </div>
            )}
        </div>
    );
}

export default function CataloguePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}><CatalogueOrderPageContent /></Suspense>;
}
