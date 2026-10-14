'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Percent, MessageCircle, Send, Sparkles, Camera, ImagePlus, RefreshCcw, ShieldCheck, Share2, Download, Facebook, Instagram } from 'lucide-react';
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
import { virtualTryOn } from '@/ai/flows/virtual-try-on';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
            toast({ title: "Look Generated!", description: `Success.` });
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

    const mainProduct = products[0];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 md:px-8 shadow-sm">
                {magazine?.logoDataUri && (
                    <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image src={magazine.logoDataUri} fill alt="logo" className="object-contain p-1" unoptimized />
                    </div>
                )}
                <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-900">{magazine?.title}</h1>
                <p className="text-sm text-muted-foreground mt-2 font-bold uppercase tracking-widest">{magazine?.vendorTitle || `Curated by ${magazine?.creatorName}`}</p>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 space-y-12">
                {/* Hero Magic Mirror Section */}
                {mainProduct && (magazine?.isTryOnEnabled || mainProduct.isTryOnEnabled) && (
                    <Card className="rounded-[40px] border-none shadow-2xl overflow-hidden bg-slate-900 text-white grid grid-cols-1 lg:grid-cols-2">
                        <div className="relative aspect-[4/5] lg:aspect-auto">
                            {tryOnProductId === mainProduct.id && tryOnResult ? (
                                <Image src={tryOnResult} fill alt="Virtual Look" className="object-cover animate-in fade-in duration-700" unoptimized />
                            ) : (
                                <Image src={mainProduct.imageDataUris[0]} fill alt={mainProduct.title} className="object-cover" unoptimized />
                            )}
                            {isTryOnLoading && tryOnProductId === mainProduct.id && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 gap-4">
                                    <Sparkles className="h-16 w-16 text-primary animate-bounce" />
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">AI Fitting Room...</h3>
                                    <p className="text-xs text-slate-400 animate-pulse">Personalizing your outfit with precision.</p>
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-primary/90 text-white font-black italic text-lg px-4 py-1 animate-pulse">✨ TRY ON WITH AI</Badge>
                            </div>
                        </div>
                        <div className="p-8 md:p-16 flex flex-col justify-center space-y-8">
                            <div className="space-y-4">
                                <Badge className="bg-primary text-white font-black italic">FEATURED PRODUCT</Badge>
                                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">{mainProduct.title}</h2>
                                <p className="text-slate-400 text-lg italic">"Experience a perfect virtual fit instantly."</p>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            id="hero-consent" 
                                            checked={hasConsented} 
                                            onCheckedChange={(val) => setHasConsented(val as boolean)}
                                            className="mt-1 border-white/50"
                                        />
                                        <Label htmlFor="hero-consent" className="text-[10px] leading-relaxed text-slate-300 font-medium">
                                            Privacy Policy: We do not store your photos. They are processed instantly and deleted immediately after generation.
                                        </Label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Style</Label>
                                        <Select value={selectedDrapeStyle} onValueChange={(val: any) => setSelectedDrapeStyle(val)}>
                                            <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white rounded-xl text-xs font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Western Wear">Western Fit (Mini/Tight Fit)</SelectItem>
                                                <SelectItem value="Western Dress">Modern Western Dress</SelectItem>
                                                <SelectItem value="Kurti">Traditional Kurti</SelectItem>
                                                <SelectItem value="Standard Saree">Standard Saree</SelectItem>
                                                <SelectItem value="East Indian Lugra">East Indian Lugra</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {showSleeveOption && (
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
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {tryOnResult && tryOnProductId === mainProduct.id ? (
                                        <div className="col-span-full space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button onClick={() => { setTryOnResult(null); setTryOnProductId(null); }} variant="outline" className="h-14 rounded-2xl font-black uppercase italic border-white/20 text-white">
                                                    <RefreshCcw className="mr-2 h-5 w-5" /> Retake
                                                </Button>
                                                <Button onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = tryOnResult!;
                                                    link.download = `my_look_${mainProduct.id}.jpg`;
                                                    link.click();
                                                }} className="h-14 rounded-2xl font-black uppercase italic bg-white text-slate-900 shadow-xl">
                                                    <Download className="mr-2 h-5 w-5" /> Save
                                                </Button>
                                            </div>
                                            <Button onClick={() => handleShareWhatsAppTryOn(tryOnResult!, mainProduct.title)} className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase italic rounded-2xl shadow-xl">
                                                <Share2 className="mr-2 h-6 w-6" /> Share Look
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Button 
                                                onClick={() => { setTryOnProductId(mainProduct.id); cameraInputRef.current?.click(); }}
                                                disabled={!hasConsented || isTryOnLoading}
                                                className="h-14 rounded-2xl font-black uppercase italic bg-primary hover:bg-primary/90 text-white shadow-xl"
                                            >
                                                <Camera className="mr-2 h-5 w-5" /> Take Selfie
                                            </Button>
                                            <Button 
                                                onClick={() => { setTryOnProductId(mainProduct.id); galleryInputRef.current?.click(); }}
                                                disabled={!hasConsented || isTryOnLoading}
                                                variant="secondary" 
                                                className="h-14 rounded-2xl font-black uppercase italic bg-white/10 hover:bg-white/20 text-white border-white/10"
                                            >
                                                <ImagePlus className="mr-2 h-5 w-5" /> Gallery
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Button onClick={() => handleOrderClick(mainProduct)} size="lg" className="w-full h-16 rounded-2xl font-black uppercase italic text-xl border-4 border-white/10 bg-transparent hover:bg-white hover:text-slate-900 transition-all">
                                <ShoppingCart className="mr-2 h-6 w-6" /> Order This Item
                            </Button>
                        </div>
                    </Card>
                )}

                <div className="space-y-6">
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-400 border-b pb-4">Browse Collection</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {products.map(product => {
                            const price = (product as any).price || (product as any).costPrice;
                            const isProductTryOn = tryOnProductId === product.id;
                            const canTryOn = magazine?.isTryOnEnabled || product.isTryOnEnabled;
                            
                            const isShirt = (product.title.toLowerCase().includes('shirt') || product.title.toLowerCase().includes('t-shirt')) && !product.title.toLowerCase().includes('dress');

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
                                        
                                        {canTryOn && !isProductTryOn && !tryOnResult && (
                                            <div className="absolute top-4 left-4 z-10">
                                                <Badge className="bg-primary/90 text-white font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                                                    <Sparkles className="h-2 w-2" /> TRY ME
                                                </Badge>
                                            </div>
                                        )}

                                        {discount > 0 && <Badge className="absolute top-4 right-4 bg-destructive text-white font-black italic">-{discount}%</Badge>}
                                        
                                        {canTryOn && !isProductTryOn && (
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <Button size="sm" className="pointer-events-auto rounded-full bg-white/90 text-slate-900 hover:bg-white font-black italic text-[10px] scale-90 group-hover:scale-100 transition-transform" onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }}>
                                                    <Sparkles className="mr-1 h-3 w-3 text-primary" /> MAGIC MIRROR
                                                </Button>
                                            </div>
                                        )}

                                        {isProductTryOn && tryOnResult && (
                                            <div className="absolute top-2 left-2 flex gap-1">
                                                <Button onClick={() => handleShareWhatsAppTryOn(tryOnResult!, product.title)} size="icon" className="h-8 w-8 rounded-full bg-green-600 shadow-lg border-none text-white">
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                <Button onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = tryOnResult!;
                                                    link.download = `my_look_${product.id}.jpg`;
                                                    link.click();
                                                }} size="icon" className="h-8 w-8 rounded-full bg-white shadow-lg border-none text-slate-900">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button onClick={() => { setTryOnResult(null); setTryOnProductId(null); }} size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg">
                                                    <RefreshCcw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                                        <div className="space-y-1">
                                            <h3 className="font-black italic uppercase text-slate-800 line-clamp-1">{product.title}</h3>
                                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{product.description}"</p>
                                        </div>

                                        <div className="pt-4 border-t mt-4 flex justify-between items-center">
                                            <span className="text-xl font-black text-primary">₹{price}</span>
                                            <div className="flex gap-2">
                                                 <Dialog onOpenChange={(open) => !open && setEnquiryProduct(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="font-bold text-[10px] uppercase" onClick={() => setEnquiryProduct(product)}>Enquire</Button>
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
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-0 border-t bg-slate-50 grid grid-cols-2">
                                        <Button 
                                            variant="ghost" 
                                            className={cn(
                                                "h-12 rounded-none border-r font-black uppercase italic text-[10px] flex items-center gap-1 transition-colors",
                                                canTryOn ? "bg-primary/5 hover:bg-primary/10" : "opacity-50 cursor-not-allowed"
                                            )}
                                            disabled={!canTryOn || !hasConsented || isTryOnLoading}
                                            onClick={() => { setTryOnProductId(product.id); cameraInputRef.current?.click(); }}
                                        >
                                            <Sparkles className="h-3 w-3 text-primary" /> {canTryOn ? 'MAGIC MIRROR' : 'TRY-ON OFF'}
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            className="h-12 rounded-none font-black uppercase italic text-[10px] flex items-center gap-1 text-primary hover:bg-slate-100 transition-colors"
                                            onClick={() => handleOrderClick(product)}
                                        >
                                            <ShoppingCart className="h-3 w-3" /> Order
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
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

export default function SmartMagazinePage() {
    return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin" /></div>}><SmartMagazineContent /></Suspense>;
}
