'use client';

import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, MessageCircle, Sparkles, Camera, ImagePlus, RefreshCcw, ShieldCheck, Share2, Download, Store, Star } from 'lucide-react';
import Image from 'next/image';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
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

export const maxDuration = 180;

type DisplayProduct = any & { isEastIndianLugra?: boolean; isTryOnEnabled?: boolean };

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

    const [isGeneeOpen, setIsGeneeOpen] = useState(false);
    const [activeGeneeProduct, setActiveGeneeProduct] = useState<any>(null);

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
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<any>('seller_products'),
                    getCollection<any>('product_drops')
                ]);
                
                const productMap = new Map<string, any>();
                (sellerProducts || []).forEach(p => productMap.set(p.id, p));
                (productDrops || []).forEach(p => productMap.set(p.id, p));

                const fetched = productIds.map(id => productMap.get(id)).filter(p => !!p);
                setProducts(fetched);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProducts();
    }, [searchParams]);

    const getProductContext = useCallback((p: DisplayProduct) => {
        if (!p) return { type: 'General', hint: 'selfie', label: 'SELFIE', isApparel: false };
        const title = p.title.toLowerCase();
        const cat = (p.category || '').toLowerCase();
        
        const isWatch = title.includes('watch') || cat.includes('watch');
        const isShoes = title.includes('shoe') || title.includes('sneaker') || title.includes('sandal') || title.includes('footwear');
        const isEyewear = title.includes('glass') || title.includes('shade') || title.includes('spectacle') || cat.includes('eyewear');
        
        const isMini = title.includes('mini') || (p.description || '').toLowerCase().includes('mini') || title.includes('skirt') || (p.description || '').toLowerCase().includes('skirt') || title.includes('short');
        const isDress = (title.includes('dress') || title.includes('frock') || cat.includes('dress') || cat.includes('frock')) && !isMini;
        const isKurti = (title.includes('kurti') || title.includes('kurta') || cat.includes('kurti') || cat.includes('kurta')) && !isMini && !isDress;
        const isSaree = (title.includes('saree') || title.includes('fabric') || cat.includes('saree') || cat.includes('fabric')) && !isMini && !isDress && !isKurti;

        if (isWatch) return { type: 'Accessory', hint: 'wrist', label: 'WRIST', isApparel: false };
        if (isShoes) return { type: 'Footwear', hint: 'feet', label: 'FEET', isApparel: false };
        if (isEyewear) return { type: 'Eyewear', hint: 'face', label: 'FACE', isApparel: false };
        
        if (isMini) return { type: 'Western Wear', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isDress) return { type: 'Western Dress', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isKurti) return { type: 'Kurti', hint: 'selfie', label: 'SELFIE', isApparel: true };
        if (isSaree) return { type: 'Fabric', hint: 'selfie', label: 'SELFIE', isApparel: true };
        
        return { type: 'General', hint: 'selfie', label: 'SELFIE', isApparel: false };
    }, []);

    const activeTryOnProduct = useMemo(() => products.find(p => p.id === tryOnProductId) || null, [products, tryOnProductId]);
    const activeTryOnContext = useMemo(() => getProductContext(activeTryOnProduct as DisplayProduct), [activeTryOnProduct, getProductContext]);

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
                    garmentType: getProductContext(product).type,
                    drapeStyle: selectedDrapeStyle,
                    sleeveLength: selectedSleeves
                })
            });
            
            const result = await res.json();
            if (result.error) toast({ variant: 'destructive', title: "Try-On Failed", description: result.error });
            else if (result.generatedImageDataUri) setTryOnResult(result.generatedImageDataUri);
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed" });
            setTryOnProductId(null);
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleSaveLook = async () => {
        if (!tryOnResult) return;
        try {
            const response = await fetch(tryOnResult);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `my_snazzify_look_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast({ title: "Look Saved!", description: "Check your downloads or gallery." });
        } catch (err) {
            toast({ variant: 'destructive', title: "Save Failed", description: "Long-press the image to save." });
        }
    };

    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', typeof window !== 'undefined' ? window.location.href : '');
        if (magazine?.creatorId) { catalogueParams.set('sellerId', magazine.creatorId); catalogueParams.set('sellerName', magazine.creatorName); }
        if (discount > 0) catalogueParams.set('discount', discount.toString());
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    if (!mounted || isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-8 md:px-8 shadow-sm text-center">
                {magazine?.logoDataUri && <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white"><Image src={magazine.logoDataUri} fill alt="logo" className="object-contain p-1" unoptimized /></div>}
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                <p className="text-sm text-primary mt-2 font-black uppercase tracking-widest flex items-center justify-center gap-3">
                    <span className="h-px w-10 bg-primary/20"></span>
                    {magazine?.vendorTitle || (magazine?.creatorName ? `Curated by ${magazine.creatorName}` : '')}
                    <span className="h-px w-10 bg-primary/20"></span>
                </p>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-12">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {products.map(product => {
                        const price = (product as any).price || (product as any).costPrice;
                        const productCtx = getProductContext(product);
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
                                    {isProductTryOn && isTryOnLoading && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20"><Sparkles className="h-10 w-10 text-primary animate-bounce mb-2" /><p className="text-[10px] font-black uppercase italic">AI Fitting...</p></div>}
                                    {canTryOn && !isProductTryOn && <div className="absolute top-4 left-4 z-10"><Badge className="bg-primary/90 text-white font-black italic text-[9px] px-3 py-1 rounded-full animate-pulse">TRY ME</Badge></div>}
                                    <div className="absolute top-4 right-4 z-20"><Badge className="bg-white/95 text-primary font-black italic text-[10px] px-3 py-1 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all" onClick={() => { setActiveGeneeProduct(product); setIsGeneeOpen(true); }}><Star className="h-2.5 w-2.5 fill-primary mr-1" /> ASK ME</Badge></div>
                                </div>
                                <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                    <h3 className="font-black italic uppercase text-slate-800 line-clamp-1">{product.title}</h3>
                                    <div className="pt-4 border-t mt-4 flex justify-between items-center"><span className="text-xl font-black text-primary">₹{price}</span><Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase" onClick={() => setEnquiryProduct(product)}>Enquire</Button></div>
                                </CardContent>
                                <CardFooter className="p-0 border-t bg-slate-50 grid grid-cols-2">
                                    <Button variant="ghost" className="h-12 rounded-none border-r font-black uppercase italic text-[10px]" disabled={!canTryOn || isTryOnLoading} onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }}>
                                        <Sparkles className="h-3 w-3 text-primary mr-1" /> {canTryOn ? `TAKE ${productCtx.label}` : 'OFF'}
                                    </Button>
                                    <Button variant="ghost" className="h-12 rounded-none font-black uppercase italic text-[10px] text-primary" onClick={() => handleOrderClick(product)}><ShoppingCart className="h-3 w-3 mr-1" /> Order</Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>

                {activeTryOnProduct && (
                    <Card className="rounded-[24px] bg-slate-900 text-white p-6 shadow-2xl relative border-none animate-in slide-in-from-bottom-5">
                        <div className="flex flex-col gap-6">
                            <div className="space-y-1"><h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" /> Magic Mirror Controls</h3><p className="text-xs text-slate-400">Refining fit for: <span className="font-bold text-white">{activeTryOnProduct.title}</span></p></div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-4">
                                <div className="flex items-start gap-3"><Checkbox id="privacy-consent-mag" checked={hasConsented} onCheckedChange={(val) => setHasConsented(val as boolean)} className="mt-1 border-white/50" /><Label htmlFor="privacy-consent-mag" className="text-[10px] text-slate-300">I consent to secure AI processing of my photo. It will be deleted instantly.</Label></div>
                                {activeTryOnContext.isApparel && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Style Mode</Label><Select value={selectedDrapeStyle} onValueChange={(val: any) => setSelectedDrapeStyle(val)}>
                                                <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white rounded-xl text-xs font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Western Wear">Westernwear (Short/Mini)</SelectItem><SelectItem value="Western Dress">Western Dress</SelectItem><SelectItem value="Kurti">Ethnic Kurti</SelectItem><SelectItem value="Standard Saree">Standard Saree</SelectItem><SelectItem value="East Indian Lugra">East Indian Lugra</SelectItem></SelectContent>
                                        </Select></div>
                                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Sleeves</Label><Select value={selectedSleeves} onValueChange={(val: any) => setSelectedSleeves(val)}>
                                                <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white rounded-xl text-xs font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Half Sleeves">Half Sleeves</SelectItem><SelectItem value="Full Sleeves">Full Sleeves</SelectItem><SelectItem value="Sleeveless">Sleeveless</SelectItem></SelectContent>
                                        </Select></div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button onClick={() => cameraInputRef.current?.click()} disabled={!hasConsented || isTryOnLoading} className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 font-bold"><Camera className="mr-2 h-4 w-4" /> Retake Photo</Button>
                                    <Button onClick={handleSaveLook} className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl h-12 font-bold" disabled={!tryOnResult}><Download className="mr-2 h-4 w-4" /> Save Look</Button>
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
                    <DialogFooter><Button onClick={async () => { if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) return; setIsEnquiring(true); try { const id = uuidv4(); await saveDocument('leads', { id, customerName: enquiryForm.name, contactNo: enquiryForm.phone, productOrdered: enquiryProduct.title, productId: enquiryProduct.id, price: ((enquiryProduct as any).price || (enquiryProduct as any).costPrice).toString(), paymentStatus: 'Enquiry', date: new Date().toISOString(), sellerId: magazine?.creatorId || 'admin', sellerName: magazine?.creatorName || 'Admin', source: 'SmartMagazine', imageDataUris: enquiryProduct.imageDataUris }, id); toast({ title: "Enquiry Sent!" }); setEnquiryProduct(null); } finally { setIsEnquiring(false); } }} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => activeTryOnProduct && handleTryOnUpload(e, activeTryOnProduct)} />
            
            <ProductGenee isOpen={isGeneeOpen} onOpenChange={setIsGeneeOpen} product={activeGeneeProduct} allProducts={products} storeName={magazine?.vendorTitle || magazine?.creatorName || 'Snazzify Store'} />
            
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"><Button onClick={() => { if(!magazine) return; const phone = sanitizePhoneNumber(magazine.contactNo || '919920320790'); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hi! I'm visiting your collection: *${magazine.title}*`)}`, '_blank'); }} className="rounded-full h-16 px-10 bg-green-600 hover:bg-green-700 shadow-2xl font-black uppercase italic tracking-tighter text-white border-4 border-white transition-transform hover:scale-105 active:scale-95"><MessageCircle className="mr-2 h-6 w-6" /> Chat with Seller</Button></div>
        </div>
    );
}

export default function SmartMagazinePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}><SmartMagazineContent /></Suspense>;
}
