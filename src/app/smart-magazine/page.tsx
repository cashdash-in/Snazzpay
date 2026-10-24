
'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send, Sparkles, Camera, ImagePlus, RefreshCcw, ShieldCheck, Share2, Download, Facebook, Instagram, Store, Star } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '../seller/ai-product-uploader/page';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import type { ProductDrop } from '../vendor/product-drops/page';
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
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ProductGenee } from '@/components/genee/product-genee';

export const maxDuration = 120;

type DisplayProduct = (SellerProduct | ProductDrop) & { isEastIndianLugra?: boolean; isTryOnEnabled?: boolean };

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
    contactNo?: string;
};

const MAX_TRYON_SIZE_PX = 448;

function SmartMagazineContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [products, setProducts] = useState<DisplayProduct[]>([]);
    const [magazine, setMagazine] = useState<Magazine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [discount, setDiscount] = useState<number>(0);
    const [mounted, setMounted] = useState(false);
    
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [tryOnProductId, setTryOnProductId] = useState<string | null>(null);
    const [hasConsented, setHasConsented] = useState(false);
    const [selectedDrapeStyle, setSelectedDrapeStyle] = useState<'Standard Saree' | 'East Indian Lugra' | 'Western Wear' | 'Western Dress' | 'Kurti'>('Western Wear');
    const [selectedSleeves, setSelectedSleeves] = useState<'Half Sleeves' | 'Full Sleeves' | 'Sleeveless'>('Half Sleeves');
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [enquiryProduct, setEnquiryProduct] = useState<DisplayProduct | null>(null);
    const [enquiryForm, setEnquiryForm] = useState({ name: '', phone: '', message: '' });
    const [isEnquiring, setIsEnquiring] = useState(false);

    useEffect(() => {
        setMounted(true);
        const discountParam = searchParams.get('discount');
        if (discountParam) setDiscount(parseFloat(discountParam));

        async function fetchProducts() {
            const magazineId = searchParams.get('id');
            if (!magazineId) { setIsLoading(false); return; }

            try {
                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', magazineId);
                if (!fetchedMagazine) { setIsLoading(false); return; }
                setMagazine(fetchedMagazine);
                
                const productIds = fetchedMagazine.productIds || [];
                if (productIds.length === 0) { setIsLoading(false); return; }
                
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<any>('seller_products'),
                    getCollection<any>('product_drops')
                ]);
                
                const productMap = new Map<string, any>();
                (sellerProducts || []).forEach(p => productMap.set(p.id, p));
                (productDrops || []).forEach(p => productMap.set(p.id, p));

                const fetched = productIds.map(id => productMap.get(id)).filter(p => !!p) as DisplayProduct[];
                setProducts(fetched);
            } catch (error) {
                console.error("Failed to fetch products:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [searchParams]);

    const getProductContext = (p: DisplayProduct) => {
        const title = p.title.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        
        const isWatch = title.includes('watch') || cat.includes('watch');
        const isShoes = title.includes('shoe') || title.includes('sandal') || title.includes('sneaker') || title.includes('footwear');
        const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle') || cat.includes('eyewear') || cat.includes('glass');
        
        const isShirt = (title.includes('shirt') || title.includes('t-shirt') || cat.includes('shirt') || cat.includes('top')) && !title.includes('dress');
        const isDress = title.includes('dress') || title.includes('frock') || cat.includes('dress') || cat.includes('frock');
        const isKurti = title.includes('kurti') || title.includes('kurta') || cat.includes('kurti') || cat.includes('kurta');
        const isSaree = title.includes('saree') || title.includes('lugra') || cat.includes('saree') || cat.includes('fabric');
        const isSkirt = title.includes('skirt') || title.includes('mini') || cat.includes('skirt') || cat.includes('mini');

        if (isWatch) return { type: 'Accessory', hint: 'wrist', label: 'WRIST', isApparel: false };
        if (isShoes) return { type: 'Footwear', hint: 'feet', label: 'FEET', isApparel: false };
        if (isEyewear) return { type: 'Eyewear', hint: 'face', label: 'FACE', isApparel: false };
        if (isShirt) return { type: 'Shirt', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isDress) return { type: 'Dress', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isKurti) return { type: 'Kurti', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isSaree) return { type: 'Fabric', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isSkirt) return { type: 'Western Wear', hint: 'selfie', label: 'SELFIE', isApparel: true };
        
        return { type: 'General', hint: 'selfie', label: 'SELFIE', isApparel: false };
    };

    const resizeImageForAI = (fileOrUri: File | string, maxSize: number = MAX_TRYON_SIZE_PX): Promise<string> => {
        return new Promise((resolve, reject) => {
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

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: DisplayProduct) => {
        if (!hasConsented) { toast({ variant: 'destructive', title: "Consent Required" }); return; }
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        setTryOnProductId(product.id);

        // Track Try-On Attempt
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'tryOnAttempt' })
        });
        
        const ctx = getProductContext(product);

        try {
            const [personUri, productUri] = await Promise.all([
                resizeImageForAI(file),
                resizeImageForAI(product.imageDataUris[0])
            ]);
            
            const res = await fetch('/api/ai/virtual-try-on', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personImageDataUri: personUri,
                    productImageDataUri: productUri,
                    productTitle: product.title,
                    garmentType: ctx.type,
                    drapeStyle: selectedDrapeStyle,
                    sleeveLength: selectedSleeves
                })
            });
            
            const result = await res.json();
            
            if (result.error) {
                toast({ variant: 'destructive', title: "Try-On Failed", description: result.error });
            } else if (result.generatedImageDataUri) {
                setTryOnResult(result.generatedImageDataUri);
                // Track Try-On Success
                fetch('/api/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'tryOnSuccess' })
                });
                toast({ title: "Magic Mirror Ready!" });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err.message });
            setTryOnProductId(null);
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleWhatsAppBusinessChat = () => {
        if (!magazine) return;
        const msg = `Hi! I'm visiting your Smart Magazine: *${magazine.title}* and I'm interested in buying. \n\nI want to:\n1️⃣ Browse Collection\n2️⃣ Check Availability\n3️⃣ Get Recommendation\n4️⃣ Talk to Human Agent\n\n*Reference:* ${window.location.href}`;
        const phone = sanitizePhoneNumber(magazine.contactNo || '919920320790');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', typeof window !== 'undefined' ? window.location.href : '');
        if (magazine?.creatorId) {
            catalogueParams.set('sellerId', magazine.creatorId);
            catalogueParams.set('sellerName', magazine.creatorName);
        }
        if (discount > 0) catalogueParams.set('discount', discount.toString());
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    const handleSendEnquiry = async () => {
        if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) { toast({ variant: 'destructive', title: "Details Required" }); return; }
        setIsEnquiring(true);
        try {
            const leadId = uuidv4();
            await saveDocument('leads', {
                id: leadId, customerName: enquiryForm.name, contactNo: enquiryForm.phone, productOrdered: enquiryProduct.title, productId: enquiryProduct.id,
                price: ((enquiryProduct as any).price || (enquiryProduct as any).costPrice).toString(), paymentStatus: 'Enquiry',
                date: new Date().toISOString(), sellerId: magazine?.creatorId || 'admin', sellerName: magazine?.creatorName || 'Admin',
                source: 'SmartMagazine', isRead: false, imageDataUris: enquiryProduct.imageDataUris,
            }, leadId);
            toast({ title: "Enquiry Sent!" });
            setEnquiryProduct(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed" });
        } finally {
            setIsEnquiring(false);
        }
    };

    if (!mounted || isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-8 md:px-8 shadow-sm text-center">
                {magazine?.logoDataUri ? (
                    <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
                        <Image src={magazine.logoDataUri} fill alt="Store Logo" className="object-contain p-1" unoptimized />
                    </div>
                ) : (
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Store className="h-8 w-8" />
                    </div>
                )}
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                <p className="text-sm md:text-base text-primary mt-2 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                    <span className="h-px w-10 bg-primary/20"></span>
                    {magazine?.vendorTitle || `Curated by ${magazine?.creatorName}`}
                    <span className="h-px w-10 bg-primary/20"></span>
                </p>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {products.map(product => {
                        const price = (product as any).price || (product as any).costPrice;
                        const ctx = getProductContext(product);
                        const isProductTryOn = tryOnProductId === product.id;
                        const canTryOn = magazine?.isTryOnEnabled || product.isTryOnEnabled;

                        return (
                            <Card key={product.id} className="group rounded-[32px] border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white flex flex-col">
                                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                                    {isProductTryOn && tryOnResult ? (
                                        <Image src={tryOnResult} fill alt="Try On" className="object-cover animate-in fade-in duration-500" unoptimized />
                                    ) : (
                                        <Image src={(product.imageDataUris || [])[0]} fill alt={product.title} className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                                    )}
                                    
                                    {isProductTryOn && isTryOnLoading && (
                                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                                            <Sparkles className="h-10 w-10 text-primary animate-bounce mb-2" />
                                            <p className="text-[10px] font-black uppercase italic text-slate-900">AI Fitting...</p>
                                        </div>
                                    )}
                                    
                                    {canTryOn && !isProductTryOn && !tryOnResult && (
                                        <div className="absolute top-4 left-4 z-10">
                                            <Badge className="bg-primary/90 text-white font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                <Sparkles className="h-2 w-2" /> TRY ME
                                            </Badge>
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 z-20">
                                        <ProductGenee product={{...product, price}} allProducts={products} storeName={magazine?.vendorTitle || magazine?.creatorName || 'Snazzify Store'} />
                                    </div>
                                </div>
                                <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-black italic uppercase text-slate-800 line-clamp-1">{product.title}</h3>
                                        <p className="text-xs text-muted-foreground line-clamp-2 italic">"{product.description}"</p>
                                    </div>
                                    <div className="pt-4 border-t mt-4 flex justify-between items-center">
                                        <span className="text-xl font-black text-primary">₹{price}</span>
                                        <Dialog open={enquiryProduct?.id === product.id} onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase" onClick={() => setEnquiryProduct(product)}>Enquire</Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[32px] p-8 border-none">
                                                <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Product Enquiry</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black">Your Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                                                    <div className="space-y-1"><Label className="text-[10px] uppercase font-black">WhatsApp Number</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                                                </div>
                                                <DialogFooter><Button onClick={handleSendEnquiry} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-0 border-t bg-slate-50 grid grid-cols-2">
                                    <Button variant="ghost" className="h-12 rounded-none border-r font-black uppercase italic text-[10px] flex items-center gap-1" disabled={!canTryOn || isTryOnLoading} onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }}>
                                        <Sparkles className="h-3 w-3 text-primary" /> {canTryOn ? `TAKE ${ctx.label}` : 'OFF'}
                                    </Button>
                                    <Button variant="ghost" className="h-12 rounded-none font-black uppercase italic text-[10px] text-primary" onClick={() => handleOrderClick(product)}>
                                        <ShoppingCart className="h-3 w-3" /> Order
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </main>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
                <Button onClick={handleWhatsAppBusinessChat} className="rounded-full h-16 px-10 bg-green-600 hover:bg-green-700 shadow-[0_20px_50px_rgba(22,163,74,0.3)] font-black uppercase italic tracking-tighter text-white border-4 border-white transition-transform hover:scale-105 active:scale-95">
                    <MessageCircle className="mr-2 h-6 w-6" /> Chat with Seller
                </Button>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const p = products.find(p => p.id === tryOnProductId); if (p) handleTryOnUpload(e, p); }} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const p = products.find(p => p.id === tryOnProductId); if (p) handleTryOnUpload(e, p); }} />
        </div>
    );
}

export default function SmartMagazinePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><SmartMagazineContent /></Suspense>;
}
