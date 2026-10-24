
'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, MessageCircle, Sparkles, Camera, ImagePlus, RefreshCcw, Download, Store, Share2, ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import Image from 'next/image';
import type { SellerProduct } from '@/types/product';
import { getCollection, getDocument, saveDocument } from '@/services/firestore';
import type { ProductDrop } from '@/types/product';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { virtualTryOn } from '@/ai/flows/virtual-try-on';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ProductGenee } from '@/components/genee/product-genee';
import { sanitizePhoneNumber } from '@/lib/utils';

export const maxDuration = 120;

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
    contactNo?: string;
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
                    getCollection<SellerProduct>('seller_products'),
                    getCollection<ProductDrop>('product_drops')
                ]);
                
                const productMap = new Map<string, DisplayProduct>();
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

    const getProductContext = (p: DisplayProduct) => {
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
    };

    const handleWhatsAppBusinessChat = () => {
        if (!magazine) return;
        const msg = `Hi! I'm visiting your Branded Collection: *${magazine.title}* and I'm interested in buying. \n\nI want to:\n1️⃣ Browse Collection\n2️⃣ Check Availability\n3️⃣ Get Recommendation\n4️⃣ Talk to Human Agent\n\n*Reference:* ${window.location.href}`;
        const phone = sanitizePhoneNumber(magazine.contactNo || '919920320790');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>, product: DisplayProduct) => {
        if (!hasConsented) { toast({ variant: 'destructive', title: "Consent Required" }); return; }
        const file = e.target.files?.[0];
        if (!file) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        setTryOnProductId(product.id);
        
        const ctx = getProductContext(product);

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
            setTryOnProductId(null);
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
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

    const handleOrderClick = (product: DisplayProduct) => {
        const catalogueParams = new URLSearchParams();
        catalogueParams.set('id', product.id);
        catalogueParams.set('return_url', window.location.href);
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

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

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
                           {magazine?.vendorTitle || `Curated by ${magazine?.creatorName}`}
                           <span className="h-px w-8 bg-primary/20"></span>
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => {
                         const price = ((product as any).price || (product as any).costPrice);
                         const discountedPrice = discount > 0 ? price - (price * (discount / 100)) : price;
                         const ctx = getProductContext(product);
                         const isProductTryOn = tryOnProductId === product.id;
                         const canTryOn = magazine?.isTryOnEnabled || product.isTryOnEnabled;

                        return (
                        <Card key={product.id} className="shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col group rounded-[24px] bg-white border-none">
                            <div className="relative w-full h-48 sm:h-64 bg-slate-100 overflow-hidden">
                                {isProductTryOn && tryOnResult ? (
                                    <Image src={tryOnResult} fill alt="Try On Result" className="object-cover animate-in fade-in duration-500" unoptimized />
                                ) : (
                                    <Carousel className="w-full h-full relative group/carousel">
                                        <CarouselContent>
                                            {(product.imageDataUris || []).map((uri, index) => (
                                                <CarouselItem key={index}>
                                                    <div className="relative w-full h-48 sm:h-64">
                                                        <Image src={uri} alt={product.title} fill className="object-cover" unoptimized />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {product.imageDataUris && product.imageDataUris.length > 1 && (
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

                                {canTryOn && !isProductTryOn && (
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
                             <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-base font-bold mb-1 line-clamp-1 flex-grow uppercase italic">{product.title}</h3>
                                <div className="mt-auto border-t pt-2 flex justify-between items-center">
                                     <p className="text-lg font-black text-primary">₹{discountedPrice.toFixed(2)}</p>
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
                                                <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Your Name</Label><Input value={enquiryForm.name} onChange={e => setEnquiryForm({...enquiryForm, name: e.target.value})} className="h-12 rounded-xl" /></div>
                                                <div className="space-y-1"><Label className="text-[10px] font-black uppercase">WhatsApp Number</Label><Input value={enquiryForm.phone} onChange={e => setEnquiryForm({...enquiryForm, phone: e.target.value})} className="h-12 rounded-xl" /></div>
                                            </div>
                                            <DialogFooter><Button onClick={handleSendEnquiry} className="w-full h-14 rounded-2xl font-black uppercase italic" disabled={isEnquiring}>{isEnquiring ? <Loader2 className="animate-spin"/> : "Send Request"}</Button></DialogFooter>
                                        </DialogContent>
                                    )}
                                </Dialog>
                                <Button variant="ghost" className="h-12 rounded-none font-black text-[10px] uppercase text-primary hover:bg-slate-100" onClick={() => handleOrderClick(product)}>
                                    <ShoppingCart className="mr-1 h-3 w-3" /> Order
                                </Button>
                            </CardFooter>
                        </Card>
                    )})}
                </div>
            </main>

            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex gap-4">
                <Button onClick={handleWhatsAppBusinessChat} className="rounded-full h-16 px-10 bg-green-600 hover:bg-green-700 shadow-2xl font-black uppercase italic tracking-tighter text-white border-4 border-white transition-transform hover:scale-105 active:scale-95">
                    <MessageCircle className="mr-2 h-6 w-6" /> Chat with Seller
                </Button>
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const p = products.find(p => p.id === tryOnProductId); if (p) handleTryOnUpload(e, p); }} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const p = products.find(p => p.id === tryOnProductId); if (p) handleTryOnUpload(e, p); }} />
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
