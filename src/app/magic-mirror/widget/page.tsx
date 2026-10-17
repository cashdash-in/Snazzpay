
'use client';

import { Suspense, useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Camera, ImagePlus, RefreshCcw, Download, Share2, ShieldCheck, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { virtualTryOn } from '@/ai/flows/virtual-try-on';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { getDocument } from '@/services/firestore';

const MAX_TRYON_SIZE_PX = 448;

function MagicMirrorWidgetContent() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const productId = searchParams.get('id');
    const [dbProduct, setDbProduct] = useState<any>(null);
    const [isProductLoading, setIsProductLoading] = useState(!!productId);

    useEffect(() => {
        if (productId) {
            async function loadProduct() {
                try {
                    let p = await getDocument('product_drops', productId!);
                    if (!p) p = await getDocument('seller_products', productId!);
                    setDbProduct(p);
                } catch (e) {
                    console.error("Error loading product for widget:", e);
                } finally {
                    setIsProductLoading(false);
                }
            }
            loadProduct();
        }
    }, [productId]);

    const productTitle = dbProduct?.title || searchParams.get('name') || 'Product';
    const productImage = dbProduct?.imageDataUris?.[0] || searchParams.get('img') || '';
    const productCategory = dbProduct?.category || '';
    
    const [isTryOnLoading, setIsTryOnLoading] = useState(false);
    const [tryOnResult, setTryOnResult] = useState<string | null>(null);
    const [hasConsented, setHasConsented] = useState(false);
    const [selectedDrapeStyle, setSelectedDrapeStyle] = useState<'Standard Saree' | 'East Indian Lugra' | 'Western Wear' | 'Western Dress' | 'Kurti'>('Western Wear');
    const [selectedSleeves, setSelectedSleeves] = useState<'Half Sleeves' | 'Full Sleeves' | 'Sleeveless'>('Half Sleeves');
    
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const categoryInfo = useMemo(() => {
        const title = productTitle.toLowerCase();
        const cat = productCategory.toLowerCase();

        const isWatch = title.includes('watch') || cat.includes('watch');
        const isFootwear = title.includes('shoe') || cat.includes('shoe') || title.includes('sandal') || cat.includes('sandal') || title.includes('sneaker') || cat.includes('sneaker') || title.includes('footwear') || cat.includes('footwear') || (title.includes('frock') === false && title.includes('heel')) || cat.includes('footwear');
        const isEyewear = title.includes('glass') || cat.includes('glass') || title.includes('shade') || cat.includes('shade') || title.includes('spectacle') || cat.includes('spectacle');
        const isShirt = (title.includes('shirt') || title.includes('t-shirt') || cat.includes('shirt')) && !title.includes('dress');
        const isDress = title.includes('dress') || title.includes('frock') || cat.includes('dress') || cat.includes('frock');
        const isKurti = title.includes('kurti') || title.includes('kurta') || cat.includes('kurti') || cat.includes('kurta');

        if (isWatch) return { type: 'Accessory', hint: 'wrist' };
        if (isFootwear) return { type: 'Footwear', hint: 'feet' };
        if (isEyewear) return { type: 'Eyewear', hint: 'face' };
        if (isShirt) return { type: 'Shirt', hint: 'selfie' };
        if (isDress) return { type: 'Dress', hint: 'selfie' };
        if (isKurti) return { type: 'Kurti', hint: 'selfie' };

        return { type: 'Fabric', hint: 'selfie' };
    }, [productTitle, productCategory]);

    const isApparel = categoryInfo.type === 'Fabric' || categoryInfo.type === 'Shirt' || categoryInfo.type === 'Dress' || categoryInfo.type === 'Kurti';

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

    const handleTryOnUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasConsented) {
            toast({ variant: 'destructive', title: "Consent Required" });
            return;
        }
        const file = e.target.files?.[0];
        if (!file || !productImage) return;

        setIsTryOnLoading(true);
        setTryOnResult(null);
        try {
            const [personUri, productUri] = await Promise.all([
                resizeImageForAI(file),
                resizeImageForAI(productImage)
            ]);
            
            const result = await virtualTryOn({
                personImageDataUri: personUri,
                productImageDataUri: productUri,
                productTitle: productTitle,
                garmentType: categoryInfo.type as any,
                drapeStyle: selectedDrapeStyle,
                sleeveLength: selectedSleeves
            });
            
            setTryOnResult(result.generatedImageDataUri);
        } catch (err: any) {
            toast({ variant: 'destructive', title: "Try-On Failed", description: err.message });
        } finally {
            setIsTryOnLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    if (isProductLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Loading Magic Mirror...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden font-sans">
            <div className="flex-1 relative flex items-center justify-center p-4">
                {tryOnResult ? (
                    <div className="relative w-full h-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                        <Image src={tryOnResult} fill alt="Result" className="object-contain rounded-3xl" unoptimized />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                            <Button onClick={() => setTryOnResult(null)} variant="secondary" className="rounded-full h-12 px-6 font-black uppercase italic text-xs shadow-2xl">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
                            </Button>
                            <Button onClick={() => {
                                const link = document.createElement('a');
                                link.href = tryOnResult!;
                                link.download = `my_look.jpg`;
                                link.click();
                            }} className="bg-white text-slate-900 hover:bg-slate-100 rounded-full h-12 px-6 font-black uppercase italic text-xs shadow-2xl">
                                <Download className="mr-2 h-4 w-4" /> Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
                        <div className="p-4 bg-white/5 rounded-full border border-white/10 animate-pulse">
                            <Sparkles className="h-12 w-12 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Magic Mirror</h2>
                            <p className="text-xs text-slate-400">See how this {productTitle} looks on your {categoryInfo.hint}</p>
                        </div>

                        <div className="w-full bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-6">
                            <div className="flex items-start gap-3">
                                <Checkbox 
                                    id="privacy-consent" 
                                    checked={hasConsented} 
                                    onCheckedChange={(val) => setHasConsented(val as boolean)}
                                    className="mt-1 border-white/50"
                                />
                                <Label htmlFor="privacy-consent" className="text-[10px] font-medium leading-relaxed text-slate-300 text-left">
                                    <span className="font-bold text-white uppercase block mb-1">Privacy Promise</span>
                                    We do not store your photos. They are deleted immediately after use.
                                </Label>
                            </div>

                            {isApparel && (
                                <div className="space-y-4">
                                    {categoryInfo.type !== 'Shirt' && (
                                        <div className="space-y-2 text-left">
                                            <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Style Mode</Label>
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
                                    )}
                                    <div className="space-y-2 text-left">
                                        <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Sleeves</Label>
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

                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    onClick={() => cameraInputRef.current?.click()} 
                                    disabled={!hasConsented || isTryOnLoading}
                                    className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 font-black uppercase italic text-xs shadow-xl disabled:opacity-50"
                                >
                                    <Camera className="mr-2 h-5 w-5" /> Take {categoryInfo.hint === 'selfie' ? 'Photo' : categoryInfo.hint.toUpperCase()}
                                </Button>
                                <Button 
                                    onClick={() => galleryInputRef.current?.click()} 
                                    disabled={!hasConsented || isTryOnLoading}
                                    variant="secondary" 
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-2xl h-14 font-black uppercase italic text-xs disabled:opacity-50"
                                >
                                    <ImagePlus className="mr-2 h-5 w-5" /> Gallery
                                </Button>
                            </div>
                        </div>
                        
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5 justify-center">
                            <ShieldCheck className="h-3 w-3" /> Powered by Snazzify AI
                        </div>
                    </div>
                )}

                {isTryOnLoading && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 gap-6 z-50">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">AI Tailoring...</h3>
                            <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Crafting your virtual look with high-end precision.</p>
                        </div>
                    </div>
                )}
            </div>

            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleTryOnUpload} />
            <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleTryOnUpload} />
        </div>
    );
}

export default function MagicMirrorWidgetPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
            <MagicMirrorWidgetContent />
        </Suspense>
    );
}
