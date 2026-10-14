'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send, Play, Sparkles, Camera, ImagePlus, RefreshCcw, Download, ShieldCheck, Share2, Store } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { virtualTryOn } from '@/ai/flows/virtual-try-on';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type DisplayProduct = (SellerProduct | ProductDrop) & { isTryOnEnabled?: boolean; isEastIndianLugra?: boolean };

type Magazine = {
    id: string;
    title: string;
    vendorTitle?: string;
    productIds: string[];
    creatorId: string;
    creatorName: string;
    createdAt: string;
    discount?: number;
    logoDataUri?: string;
    isTryOnEnabled?: boolean;
};

const MAX_TRYON_SIZE_PX = 448;

function BrandedCollectionContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [discount, setDiscount] = useState<number>(0);
    
    // Try-On State
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [tryOnProductId, setTryOnProductId] = useState<string | null>(null);
    const [hasConsented, setHasConsented] = useState(false);
    const [selectedDrapeStyle, setSelectedDrapeStyle] = useState<'Standard Saree' | 'East Indian Lugra' | 'Western Wear' | 'Western Dress' | 'Kurti'>('Western Wear');
    const [selectedSleeves, setSelectedSleeves] = useState<'Half Sleeves' | 'Full Sleeves' | 'Sleeveless'>('Half Sleeves');
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Enquiry State
    const [enquiryProduct, setEnquiryProduct] = useState<DisplayProduct | null>(null);
    const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', message: '' });
    const [isEnquiring, setIsEnquiring] = useState(false);

    useEffect(() => {
        const discountParam = searchParams.get('discount');
        if (discountParam) {
            setDiscount(parseFloat(discountParam));
        }

        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'magazineSessionStart' }),
            keepalive: true,
        });

        async function fetchProducts() {
            const slug = params.id as string;

            if (!slug) {
                setIsLoading(false);
                return;
            }

            try {
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'magazineVisit' }),
                    keepalive: true,
                });

                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', slug);
                if (!fetchedMagazine) {
                    setIsLoading(false);
                    return;
                }
                setMagazine(fetchedMagazine);
                
                const productIds = fetchedMagazine.productIds;
                if (productIds.length === 0) {
                    setIsLoading(false);
                    return;
                }
                
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops')
                ]);
                
                const productMap = new Map<string, DisplayProduct>();
                sellerProducts.forEach(p => productMap.set(p.id, p));
                productDrops.forEach(p => productMap.set(p.id, p));

                const fetched = productIds.map(id => productMap.get(id)).filter(p => !!p) as DisplayProduct[];
                setProducts(fetched);
            } catch (error) {
                console.error("Failed to fetch products for magazine:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [params.id, searchParams]);

    const showSleeveOption = useMemo(() => {
        return ['Western Wear', 'Kurti', 'Western Dress', 'Standard Saree', 'East Indian Lugra'].includes(selectedDrapeStyle);
    }, [selectedDrapeStyle]);

    const resizeImageForAI = (fileOrUri: File | string, maxSize: number = MAX_TRYON_SIZE_PX): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') return reject('Window undefined');
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
                resolve(canvas.toDataURL('image/jpeg', 0.5));
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

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: DisplayProduct) => {
        if (!hasConsented) {
            toast({ variant: 'destructive', title: "Consent Required", description: "Please accept the privacy terms first." });
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        setTryOnProductId(product.id);
        
        try {
            const [personUri, productUri] = await Promise.all([
                resizeImageForAI(file),
                resizeImageForAI(product.imageDataUris[0])
            ]);
            
            const result = await virtualTryOn({
                personImageDataUri: personUri,
                productImageDataUri: productUri,
                productTitle: product.title,
                drapeStyle: selectedDrapeStyle,
                sleeveLength: selectedSleeves
            });
            
            setTryOnResult(result.generatedImageDataUri);
            toast({ title: "Magic Mirror Ready!", description: `Look generated successfully.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err.message });
            setTryOnProductId(null);
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
    };
    
    const handleShareWhatsAppTryOn = (imgUrl: string, title: string) => {
        const message = `Check out my new virtual look with this ${title} from Snazzify! ${window.location.href}`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', window.location.href);

        if (magazine?.creatorId && magazine.creatorName) {
            catalogueParams.set('sellerId', magazine.creatorId);
            catalogueParams.set('sellerName', magazine.creatorName);
        }

        if (discount > 0) {
            catalogueParams.set('discount', discount.toString());
        }
    
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    const handleSendEnquiry = async () => {
        if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) {
            toast({ variant: 'destructive', title: "Details Required", description: "Please provide your name and phone number." });
            return;
        }

        setIsEnquiring(true);
        const leadId = uuidv4();
        const price = ((enquiryProduct as SellerProduct).price || (enquiryProduct as ProductDrop).costPrice);
        const finalPrice = discount > 0 ? price - (price * (discount / 100)) : price;

        try {
            const leadData = {
                id: leadId,
                orderId: `ENQ-${uuidv4().substring(0, 6).toUpperCase()}`,
                customerName: enquiryForm.name,
                contactNo: enquiryForm.phone,
                productOrdered: enquiryProduct.title,
                productId: enquiryProduct.id,
                price: finalPrice.toString(),
                paymentStatus: 'Enquiry',
                date: new Date().toISOString(),
                sellerId: magazine?.creatorId || 'admin',
                sellerName: magazine?.creatorName || 'Admin',
                source: 'SmartMagazine',
                message: enquiryForm.message,
                isRead: false,
                imageDataUris: enquiryProduct.imageDataUris,
            };

            await saveDocument('leads', leadData, leadId);
            toast({ title: "Enquiry Sent!", description: "We have received your interest. Our team will contact you shortly." });
            setEnquiryProduct(null);
            setEnquiryForm({ name: '', phone: '', message: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send enquiry" });
        } finally {
            setIsEnquiring(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!magazine || products.length === 0) {
        return (
             <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
                <Card className="w-full max-w-2xl shadow-lg text-center">
                    <CardHeader>
                        <CardTitle>Collection Not Found</CardTitle>
                        <CardDescription>The requested collection is empty or the link is invalid.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
             <header className="bg-white border-b sticky top-0 z-50 px-4 py-6 md:px-8 text-center shadow-sm">
                <div className="max-w-4xl mx-auto">
                    {magazine.logoDataUri ? (
                        <div className="flex justify-center mb-4">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                                <Image src={magazine.logoDataUri} alt="Brand Logo" fill className="object-contain p-1" unoptimized />
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <Store className="h-10 w-10" />
                            </div>
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-slate-900">{magazine.title}</h1>
                        <p className="mt-2 text-xs md:text-sm text-primary uppercase tracking-widest font-black flex items-center justify-center gap-2">
                           <span className="h-px w-8 bg-primary/20"></span>
                           {magazine.vendorTitle || `Curated by ${magazine.creatorName}`}
                           <span className="h-px w-8 bg-primary/20"></span>
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => {
                         const price = ((product as SellerProduct).price || (product as ProductDrop).costPrice);
                         const discountedPrice = discount > 0 ? price - (price * (discount / 100)) : price;
                         const isProductTryOn = tryOnProductId === product.id;
                         const canTryOn = magazine.isTryOnEnabled || product.isTryOnEnabled;
                         
                         const isShirt = product.title.toLowerCase().includes('shirt') && !product.title.toLowerCase().includes('dress');

                        return (
                        <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group rounded-[24px] bg-white border-none">
                            <div className="relative w-full h-48 sm:h-64 bg-slate-100 overflow-hidden">
                                {isProductTryOn && tryOnResult ? (
                                    <Image src={tryOnResult} fill alt="Try On Result" className="object-cover animate-in fade-in duration-500" unoptimized />
                                ) : (
                                    <Carousel className="w-full h-full relative group/carousel">
                                        <CarouselContent>
                                            {product.imageDataUris.map((uri, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="relative w-full h-48 sm:h-64">
                                                        <Image src={uri} alt={product.title} fill className="object-cover" unoptimized />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {product.imageDataUris.length > 1 && (
                                            <>
                                                <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                                <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                            </>
                                        )}
                                    </Carousel>
                                )}
                                
                                {isProductTryOn && isTryOnLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20">
                                        <Sparkles className="h-10 w-10 text-primary animate-bounce mb-2" />
                                        <p className="text-[10px] font-black uppercase italic text-slate-900">AI Fitting room...</p>
                                    </div>
                                )}

                                {canTryOn && !isProductTryOn && !tryOnResult && (
                                    <div className="absolute top-4 left-4 z-10">
                                        <Badge className="bg-primary/90 text-white font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                            <Sparkles className="h-2 w-2" /> TRY ME
                                        </Badge>
                                    </div>
                                )}

                                {discount > 0 && (
                                    <Badge className="absolute top-4 right-4 z-10 bg-destructive text-white font-black italic">
                                        -{discount}% OFF
                                    </Badge>
                                )}

                                {isProductTryOn && tryOnResult && (
                                    <div className="absolute top-2 left-2 flex gap-1 z-30">
                                        <Button onClick={() => handleShareWhatsAppTryOn(tryOnResult!, product.title)} size="icon" className="h-8 w-8 rounded-full bg-green-600 shadow-lg border-none text-white hover:bg-green-700">
                                            <Share2 className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = tryOnResult!;
                                            link.download = `my_look_${product.id}.jpg`;
                                            link.click();
                                        }} size="icon" className="h-8 w-8 rounded-full bg-white shadow-lg border-none text-slate-900 hover:bg-slate-100">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button onClick={() => { setTryOnResult(null); setTryOnProductId(null); }} size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg">
                                            <RefreshCcw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                             <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-base font-bold mb-1 line-clamp-1 flex-grow uppercase italic">{product.title}</h3>
                                <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3">"{product.description}"</p>
                                <div className="mt-auto border-t pt-2 flex justify-between items-center">
                                     <p className="text-lg font-black text-primary">
                                        ₹{discountedPrice.toFixed(2)}
                                    </p>
                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold">{product.category}</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="p-0 border-t bg-slate-50 grid grid-cols-2">
                                <Dialog onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" className="h-12 rounded-none border-r text-[10px] font-bold uppercase" onClick={() => setEnquiryProduct(product)}>
                                            <MessageCircle className="mr-1 h-3 w-3" /> Enquire
                                        </Button>
                                    </DialogTrigger>
                                    {enquiryProduct?.id === product.id && (
                                        <DialogContent className="rounded-[32px] p-8 border-none">
                                            <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Product Enquiry</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Your Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black">WhatsApp Number</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                                                <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Message</Label><Textarea value={enquiryForm.message} onChange={e => setEnquiryForm({...enquiryForm, message: e.target.value})} className="rounded-xl" /></div>
                                            </div>
                                            <DialogFooter><Button onClick={handleSendEnquiry} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                                        </DialogContent>
                                    )}
                                </Dialog>

                                <Button 
                                    variant="ghost" 
                                    className="h-12 rounded-none font-black text-[10px] uppercase text-primary hover:bg-slate-100"
                                    onClick={() => handleOrderClick(product)}
                                >
                                    <ShoppingCart className="mr-1 h-3 w-3" /> Order
                                </Button>

                                {canTryOn && (
                                    <div className="col-span-2 border-t">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" className="w-full h-10 rounded-none bg-primary/5 hover:bg-primary/10 text-primary font-black italic text-[10px]">
                                                    <Sparkles className="mr-1.5 h-3 w-3" /> MAGIC MIRROR FITTING ROOM
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md rounded-[32px] p-8 border-none">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-black italic uppercase flex items-center gap-2">
                                                        <Sparkles className="h-6 w-6 text-primary" /> Magic Mirror
                                                    </DialogTitle>
                                                    <DialogDescription>Experience a virtual fit for {product.title}</DialogDescription>
                                                </DialogHeader>
                                                <div className="py-6 space-y-6">
                                                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                                                        <div className="flex items-start gap-3">
                                                            <Checkbox 
                                                                id={`consent-${product.id}`} 
                                                                checked={hasConsented} 
                                                                onCheckedChange={(val) => setHasConsented(val as boolean)}
                                                                className="mt-1"
                                                            />
                                                            <Label htmlFor={`consent-${product.id}`} className="text-[10px] leading-relaxed text-muted-foreground">
                                                                <span className="font-bold text-slate-900 uppercase block mb-1">Privacy Promise</span>
                                                                We do not store your photos on our server. Your selfie is processed instantly and deleted immediately after the session.
                                                            </Label>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {!isShirt && (
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400">Select Style</Label>
                                                                <Select value={selectedDrapeStyle} onValueChange={(val: any) => setSelectedDrapeStyle(val)}>
                                                                    <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Western Wear">Western Fit (Mini/Tight Fit)</SelectItem>
                                                                        <SelectItem value="Western Dress">Western Dress</SelectItem>
                                                                        <SelectItem value="Kurti">Traditional Kurti</SelectItem>
                                                                        <SelectItem value="Standard Saree">Standard Saree</SelectItem>
                                                                        <SelectItem value="East Indian Lugra">East Indian Lugra</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                        
                                                        {isShirt && (
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400">Fit Mode</Label>
                                                                <div className="h-10 px-3 bg-slate-50 text-slate-900 rounded-xl text-xs font-bold flex items-center">
                                                                    Standard Fitting
                                                                </div>
                                                            </div>
                                                        )}

                                                        {showSleeveOption && (
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400">Sleeves</Label>
                                                                <Select value={selectedSleeves} onValueChange={(val: any) => setSelectedSleeves(val)}>
                                                                    <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-none font-bold text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Half Sleeves">Half Sleeves</SelectItem>
                                                                        <SelectItem value="Full Sleeves">Full Sleeves</SelectItem>
                                                                        <SelectItem value="Sleeveless">Sleeveless</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Button 
                                                            disabled={!hasConsented || isTryOnLoading}
                                                            onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }}
                                                            className="h-14 rounded-2xl font-black uppercase italic shadow-lg"
                                                        >
                                                            <Camera className="mr-2 h-5 w-5" /> Take Selfie
                                                        </Button>
                                                        <Button 
                                                            disabled={!hasConsented || isTryOnLoading}
                                                            variant="secondary" 
                                                            onClick={() => { setTryOnProductId(product.id); galleryInputRef.current?.click(); }}
                                                            className="h-14 rounded-2xl font-black uppercase italic"
                                                        >
                                                            <ImagePlus className="mr-2 h-5 w-5" /> Gallery
                                                        </Button>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    )})}
                </div>
            </main>

            {/* Global Hidden Inputs for Try-On */}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => {
                const product = products.find(p => p.id === tryOnProductId);
                if (product) handleTryOnUpload(e, product);
            }} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const product = products.find(p => p.id === tryOnProductId);
                if (product) handleTryOnUpload(e, product);
            }} />
        </div>
    );
}

export default function BrandedCollectionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <BrandedCollectionContent />
        </Suspense>
    );
}
