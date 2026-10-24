'use client';

import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, MessageCircle, Sparkles, Camera, ImagePlus, RefreshCcw, Download, Store, Share2, ArrowLeft, ShieldCheck, Star, X } from 'lucide-react';
import Image from 'next/image';
import type { DisplayProduct, Magazine } from '@/types/product';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ProductGenee } from '@/components/genee/product-genee';
import { sanitizePhoneNumber } from '@/lib/utils';

export const maxDuration = 180;

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
    const [mounted, setMounted] = useState(false);
    
    // Try-On State
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

    // Global AI Terminal State
    const [isGeneeOpen, setIsGeneeOpen] = useState(false);
    const [activeGeneeProduct, setActiveGeneeProduct] = useState<any>(null);

    useEffect(() => {
        setMounted(true);
        const discountParam = searchParams.get('discount');
        if (discountParam) setDiscount(parseFloat(discountParam));

        async function fetchProducts() {
            const slug = params.id as string;
            if (!slug) { setIsLoading(false); return; }

            try {
                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', slug);
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
    }, [params.id, searchParams]);

    const getProductContext = useCallback((p: DisplayProduct) => {
        if (!p) return { type: 'General', hint: 'selfie', label: 'SELFIE', isApparel: false };
        const title = p.title.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        
        const isWatch = title.includes('watch') || cat.includes('watch');
        const isFootwear = title.includes('shoe') || title.includes('sneaker') || title.includes('sandal') || title.includes('heel') || title.includes('bondi') || title.includes('clifton') || title.includes('hoka') || cat.includes('footwear') || cat.includes('shoe') || cat.includes('sneaker');
        const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle') || cat.includes('eyewear') || cat.includes('glass');
        
        const isShirt = (title.includes('shirt') || title.includes('t-shirt') || cat.includes('shirt') || cat.includes('top')) && !title.includes('dress');
        const isDress = title.includes('dress') || title.includes('frock') || cat.includes('dress') || cat.includes('frock');
        const isKurti = title.includes('kurti') || title.includes('kurta') || cat.includes('kurti') || cat.includes('kurta');
        const isSaree = title.includes('saree') || title.includes('lugra') || cat.includes('saree') || cat.includes('fabric');

        if (isWatch) return { type: 'Accessory', hint: 'wrist', label: 'WRIST', isApparel: false };
        if (isFootwear) return { type: 'Footwear', hint: 'feet', label: 'FEET', isApparel: false };
        if (isEyewear) return { type: 'Eyewear', hint: 'face', label: 'FACE', isApparel: false };
        if (isShirt) return { type: 'Shirt', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isDress) return { type: 'Dress', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isKurti) return { type: 'Kurti', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isSaree) return { type: 'Fabric', hint: 'selfie', label: 'SELFIE', isApparel: true };
        
        return { type: 'General', hint: 'selfie', label: 'SELFIE', isApparel: false };
    }, []);

    const activeTryOnProduct = useMemo(() => {
        return products.find(p => p.id === tryOnProductId) || null;
    }, [products, tryOnProductId]);

    const activeTryOnContext = useMemo(() => {
        return getProductContext(activeTryOnProduct as DisplayProduct);
    }, [activeTryOnProduct, getProductContext]);

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

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: DisplayProduct) => {
        if (!hasConsented) { toast({ variant: 'destructive', title: "Consent Required" }); return; }
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        setTryOnProductId(product.id);

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

    const handleWhatsAppBusinessChat = () => {
        if (!magazine) return;
        const msg = `Hi! I'm visiting your Branded Collection: *${magazine.title}* and I'm interested in buying. \n\nI want to:\n1️⃣ Browse Collection\n2️⃣ Check Availability\n3️⃣ Get Recommendation\n4️⃣ Talk to Human Agent\n\n*Reference:* ${window.location.href}`;
        const phone = sanitizePhoneNumber(magazine.contactNo || '919920320790');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (!mounted || isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
             <header className="bg-white border-b sticky top-0 z-50 px-4 py-6 md:px-8 text-center shadow-sm">
                <div className="max-w-4xl mx-auto">
                    {magazine?.logoDataUri ? (
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
                        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                        <p className="mt-2 text-xs md:text-sm text-primary uppercase tracking-widest font-black flex items-center justify-center gap-2">
                           <span className="h-px w-8 bg-primary/20"></span>
                           {magazine?.vendorTitle || (magazine?.creatorName ? `Curated by ${magazine.creatorName}` : '')}
                           <span className="h-px w-8 bg-primary/20"></span>
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(p => {
                         const productPrice = ((p as any).price || (p as any).costPrice);
                         const discountedPrice = discount > 0 ? productPrice - (productPrice * (discount / 100)) : productPrice;
                         const isProductTryOn = tryOnProductId === p.id;
                         const canTryOn = magazine?.isTryOnEnabled || (p as any).isTryOnEnabled;

                        return (
                        <Card key={p.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group rounded-[24px] bg-white border-none">
                            <div className="relative w-full h-48 sm:h-64 bg-slate-100 overflow-hidden">
                                {isProductTryOn && tryOnResult ? (
                                    <Image src={tryOnResult} fill alt="Try On Result" className="object-cover animate-in fade-in duration-500" unoptimized />
                                ) : (
                                    <Carousel className="w-full h-full relative group/carousel">
                                        <CarouselContent>
                                            {(p.imageDataUris || []).map((uri, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="relative w-full h-48 sm:h-64">
                                                        <Image src={uri} alt={p.title} fill className="object-cover" unoptimized />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {p.imageDataUris && p.imageDataUris.length > 1 && (
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
                                        <p className="text-[10px] font-black uppercase italic text-slate-900">AI Fitting Room...</p>
                                    </div>
                                )}

                                {canTryOn && !isProductTryOn && (
                                    <div className="absolute top-4 left-4 z-10">
                                        <Badge className="bg-primary/90 text-white font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                            <Sparkles className="h-2 w-2" /> TRY ME
                                        </Badge>
                                    </div>
                                )}

                                <div className="absolute top-4 right-4 z-20">
                                    <Badge 
                                        className="bg-white/95 text-primary font-black italic text-[10px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer hover:scale-110 active:scale-95 transition-all animate-genee-flash"
                                        onClick={() => { setActiveGeneeProduct(p); setIsGeneeOpen(true); }}
                                    >
                                        <Star className="h-2.5 w-2.5 fill-primary" /> ASK ME
                                    </Badge>
                                </div>
                            </div>
                             <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-base font-bold mb-1 line-clamp-1 flex-grow uppercase italic">{p.title}</h3>
                                <div className="mt-auto border-t pt-2 flex justify-between items-center">
                                     <p className="text-lg font-black text-primary">₹{discountedPrice.toFixed(2)}</p>
                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold">{p.category}</Badge>
                                </div>
                            </CardContent>
                            <CardFooter className="p-0 border-t bg-slate-50 grid grid-cols-2">
                                <Button variant="ghost" className="h-12 rounded-none border-r text-[10px] font-bold uppercase" onClick={() => setEnquiryProduct(p)}>
                                    <MessageCircle className="mr-1 h-3 w-3" /> Enquire
                                </Button>
                                <Button variant="ghost" className="h-12 rounded-none font-black text-[10px] uppercase text-primary hover:bg-slate-100" onClick={() => handleOrderClick(p)}>
                                    <ShoppingCart className="mr-1 h-3 w-3" /> Order
                                </Button>
                            </CardFooter>
                        </Card>
                    )})}
                </div>

                {/* Shared Try-On Control Panel - Appears only when a product is being tried on */}
                {activeTryOnProduct && (
                    <Card className="rounded-[24px] bg-slate-900 text-white p-6 shadow-2xl overflow-hidden relative border-none">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="h-20 w-20" /></div>
                        <div className="flex flex-col gap-6 relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" /> Magic Mirror</h3>
                                <p className="text-xs text-slate-400">Fitting: <span className="font-bold text-white">{activeTryOnProduct.title}</span> on your {activeTryOnContext.hint}.</p>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-4">
                                <div className="flex items-start gap-3">
                                    <Checkbox 
                                        id="privacy-consent-shared" 
                                        checked={hasConsented} 
                                        onCheckedChange={(val) => setHasConsented(val as boolean)}
                                        className="mt-1 border-white/50"
                                    />
                                    <Label htmlFor="privacy-consent-shared" className="text-[10px] font-medium leading-relaxed text-slate-300">
                                        <span className="font-bold text-white uppercase block mb-1">Privacy Promise</span>
                                        We do not save pics. Your photo is processed instantly and removed.
                                    </Label>
                                </div>

                                {activeTryOnContext.isApparel && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                        {activeTryOnContext.type !== 'Shirt' && (
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
                                                    link.href = tryOnResult!;
                                                    link.download = `my_look_${activeTryOnProduct.id}.jpg`;
                                                    link.click();
                                                }} className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-12 font-bold"><Download className="mr-2 h-4 w-4" /> Save Look</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Button 
                                                onClick={() => cameraInputRef.current?.click()} 
                                                disabled={!hasConsented || isTryOnLoading}
                                                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold shadow-lg disabled:opacity-50"
                                            >
                                                <Camera className="mr-2 h-4 w-4" /> Take {activeTryOnContext.label}
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
                                    <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => activeTryOnProduct && handleTryOnUpload(e, activeTryOnProduct)} />
                                    <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => activeTryOnProduct && handleTryOnUpload(e, activeTryOnProduct)} />
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </main>

            <Dialog open={!!enquiryProduct} onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                <DialogContent className="rounded-[32px] p-8 border-none">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Product Enquiry</DialogTitle></DialogHeader>
                    {enquiryProduct && (
                        <div className="space-y-4 py-4">
                            <div className="flex gap-4 p-3 bg-muted/50 rounded-xl">
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0"><Image src={enquiryProduct.imageDataUris[0]} fill alt="p" className="object-cover" /></div>
                                <div><p className="font-bold text-xs uppercase">{enquiryProduct.title}</p><p className="text-[10px] text-primary font-bold">₹{((enquiryProduct as any).price || (enquiryProduct as any).costPrice)}</p></div>
                            </div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Your Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">WhatsApp Number</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                        </div>
                    )}
                    <DialogFooter><Button onClick={handleSendEnquiry} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <ProductGenee 
                isOpen={isGeneeOpen}
                onOpenChange={setIsGeneeOpen}
                product={activeGeneeProduct}
                allProducts={products}
                storeName={magazine?.vendorTitle || magazine?.creatorName || 'Snazzify Store'}
            />

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
                <Button onClick={handleWhatsAppBusinessChat} className="rounded-full h-16 px-10 bg-green-600 hover:bg-green-700 shadow-2xl font-black uppercase italic tracking-tighter text-white border-4 border-white transition-transform hover:scale-105 active:scale-95">
                    <MessageCircle className="mr-2 h-6 w-6" /> Chat with Seller
                </Button>
            </div>
        </div>
    );
}

export default function BrandedCollectionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <BrandedCollectionContent />
        </Suspense>
    );
}
