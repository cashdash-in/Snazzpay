'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send, Sparkles, Camera, ImagePlus, RefreshCcw } from 'lucide-react';
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
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { virtualTryOn } from '@/ai/flows/virtual-try-on';

type DisplayProduct = SellerProduct | ProductDrop;

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
    
    // Try-On State
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [tryOnProductId, setTryOnProductId] = useState<string | null>(null);
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

        async function fetchProducts() {
            const magazineId = searchParams.get('id');

            if (!magazineId) {
                setIsLoading(false);
                return;
            }

            try {
                const fetchedMagazine = await getDocument<Magazine>('smart_magazines', magazineId);
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
    }, [searchParams]);
    
    const resizeImageForAI = (fileOrUri: File | string, maxSize: number = MAX_TRYON_SIZE_PX): Promise<string> => {
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
            });
            
            setTryOnResult(result.generatedImageDataUri);
            toast({ title: "Magic Mirror Ready!", description: "AI has successfully fitted the outfit." });
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
        catalogueParams.set('return_url', window.location.href);

        if (magazine?.creatorId && magazine.creatorName) {
            catalogueParams.set('sellerId', magazine.creatorId);
            catalogueParams.set('sellerName', magazine.creatorName);
        }

        if (discount > 0) catalogueParams.set('discount', discount.toString());
        router.push(`/catalogue?${catalogueParams.toString()}`);
    };

    const handleSendEnquiry = async () => {
        if (!enquiryProduct || !enquiryForm.name || !enquiryForm.phone) {
            toast({ variant: 'destructive', title: "Details Required" });
            return;
        }
        setIsEnquiring(true);
        try {
            const leadId = uuidv4();
            await saveDocument('leads', {
                id: leadId,
                customerName: enquiryForm.name,
                contactNo: enquiryForm.phone,
                productOrdered: enquiryProduct.title,
                productId: enquiryProduct.id,
                price: ((enquiryProduct as any).price || (enquiryProduct as any).costPrice).toString(),
                paymentStatus: 'Enquiry',
                date: new Date().toISOString(),
                sellerId: magazine?.creatorId || 'admin',
                sellerName: magazine?.creatorName || 'Admin',
                source: 'SmartMagazine',
                isRead: false,
                imageDataUris: enquiryProduct.imageDataUris,
            }, leadId);
            toast({ title: "Enquiry Sent!" });
            setEnquiryProduct(null);
            setEnquiryForm({ name: '', phone: '', message: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send" });
        } finally {
            setIsEnquiring(false);
        }
    };

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-6 md:px-8 text-center shadow-sm">
                {magazine?.logoDataUri && (
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src={magazine.logoDataUri} fill alt="logo" className="object-contain p-1" unoptimized />
                    </div>
                )}
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 font-bold uppercase tracking-widest">{magazine?.vendorTitle || `Curated by ${magazine?.creatorName}`}</p>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {products.map(product => {
                    const price = (product as any).price || (product as any).costPrice;
                    const isProductTryOn = tryOnProductId === product.id;

                    return (
                        <Card key={product.id} className="group rounded-[32px] border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white flex flex-col">
                            <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                                {isProductTryOn && tryOnResult ? (
                                    <Image src={tryOnResult} fill alt="Try On" className="object-cover animate-in fade-in duration-500" unoptimized />
                                ) : (
                                    <Image src={product.imageDataUris[0]} fill alt={product.title} className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
                                )}
                                
                                {isProductTryOn && isTryOnLoading && (
                                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                                        <Sparkles className="h-10 w-10 text-primary animate-bounce mb-2" />
                                        <p className="text-[10px] font-black uppercase italic text-slate-900">AI Fitting...</p>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3">
                                    <Button onClick={() => handleOrderClick(product)} className="w-full h-12 rounded-xl font-black uppercase italic bg-primary text-white">
                                        <ShoppingCart className="mr-2 h-4 w-4" /> Order Now
                                    </Button>
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <Button onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }} variant="secondary" className="h-10 rounded-xl font-bold text-[10px] uppercase bg-white text-primary">
                                            <Camera className="mr-1 h-3 w-3" /> Selfie
                                        </Button>
                                        <Button onClick={() => { setTryOnProductId(product.id); galleryInputRef.current?.click(); }} variant="secondary" className="h-10 rounded-xl font-bold text-[10px] uppercase bg-white text-primary">
                                            <ImagePlus className="mr-1 h-3 w-3" /> Gallery
                                        </Button>
                                    </div>
                                </div>
                                {discount > 0 && <Badge className="absolute top-4 right-4 bg-destructive text-white font-black italic">-{discount}%</Badge>}
                                {isProductTryOn && tryOnResult && (
                                    <Button onClick={() => { setTryOnResult(null); setTryOnProductId(null); }} size="icon" variant="destructive" className="absolute top-4 left-4 h-8 w-8 rounded-full shadow-lg">
                                        <RefreshCcw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-black italic uppercase text-slate-800 line-clamp-1">{product.title}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 italic">"{product.description}"</p>
                                </div>
                                <div className="pt-4 border-t mt-4 flex justify-between items-center">
                                    <span className="text-xl font-black text-primary">₹{price}</span>
                                    <Dialog onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase" onClick={() => setEnquiryProduct(product)}>Enquire</Button>
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
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
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

export default function SmartMagazinePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}><SmartMagazineContent /></Suspense>;
}
