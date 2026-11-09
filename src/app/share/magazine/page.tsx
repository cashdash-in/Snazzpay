'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerProduct } from '@/types/product';
import Image from 'next/image';
import { 
    Loader2, Share2, Copy, MessageSquare, BookOpen, 
    Wand2, ImagePlus, Image as LucideImage, 
    Instagram, Download, 
} from 'lucide-react';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/types/product';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialAdCard } from '@/components/social-ad-card';
import { cn } from "@/lib/utils";

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

export default function ShareMagazinePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<any>>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [magazineLink, setMagazineLink] = useState('');
    const [magazineTitle, setMagazineTitle] = useState('Our Latest Collection');
    const [customSlug, setCustomSlug] = useState('');
    const [vendorTitle, setVendorTitle] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
    const [isTryOnEnabled, setIsTryOnEnabled] = useState(true);
    
    // Hydration stability
    const [mounted, setMounted] = useState(false);
    const [origin, setOrigin] = useState('');
    
    // Social Studio States
    const [globalAdHeadline, setGlobalAdHeadline] = useState('Exclusive Limited Offer');
    const [showWatermark, setShowWatermark] = useState(true);
    const [showBrandText, setShowBrandText] = useState(true);
    const [generatedAdUrls, setGeneratedAdUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }

        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                const currentRole = getCookie('userRole');
                
                // Fetch from all potential collections to ensure "My Products" are seen
                const [sellerProducts, productDrops] = await Promise.all([
                    getCollection<any>('seller_products'),
                    getCollection<any>('product_drops')
                ]);

                // Create a master unique map of all products
                const uniqueMap = new Map();
                
                // 1. Process drops (Vendor/Admin items)
                productDrops.forEach(p => {
                    if (p && p.id) {
                        uniqueMap.set(p.id, { ...p, sourceType: 'drop' });
                    }
                });

                // 2. Process seller products (Individual items)
                sellerProducts.forEach(p => {
                    if (p && p.id) {
                        // If it's a seller product, it might override a drop or be unique
                        uniqueMap.set(p.id, { ...p, sourceType: 'seller' });
                    }
                });

                let finalProducts = Array.from(uniqueMap.values());

                // If not admin, filter to only show what belongs to the user
                if (currentRole !== 'admin') {
                    finalProducts = finalProducts.filter(p => 
                        p.sellerId === user.uid || p.vendorId === user.uid
                    );
                }
                
                setProducts(finalProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                
                // Load branding defaults if available
                const settings = await getDocument<any>(currentRole === 'seller' ? 'seller_users' : 'vendors', user.uid);
                if (settings?.logoDataUri) {
                    setLogoDataUri(settings.logoDataUri);
                    setVendorTitle(settings.companyName || settings.name || '');
                }

            } catch (error: any) {
                console.error("Magazine loadData error:", error);
                toast({ 
                    variant: 'destructive', 
                    title: "Fetch Error", 
                    description: "Could not load products from Master Catalog." 
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLogoDataUri(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateLink = async () => {
        if (selectedProductIds.length === 0) {
            toast({ variant: 'destructive', title: "Select products first" });
            return;
        }
        const finalId = customSlug ? customSlug.toLowerCase().trim().replace(/\s+/g, '-') : uuidv4();
        const newMagazine: Magazine = {
            id: finalId,
            title: magazineTitle,
            productIds: selectedProductIds,
            creatorId: user!.uid,
            creatorName: user!.displayName || 'Creator',
            createdAt: new Date().toISOString(),
            logoDataUri: logoDataUri || undefined,
            discount: discount || undefined,
            vendorTitle: vendorTitle || undefined,
            isTryOnEnabled: isTryOnEnabled,
        };
        await saveDocument('smart_magazines', newMagazine, finalId);
        setMagazineLink(`${origin}/smart-magazine?id=${finalId}${discount > 0 ? `&discount=${discount}` : ''}`);
        toast({ title: 'Collection Saved & Linked!' });
    };

    const handleShareCollectionWhatsApp = () => {
        if (!magazineLink) return;
        const msg = `Check out our new ${magazineTitle} here: ${magazineLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (!mounted) return null;

    return (
        <AppShell title="Marketing & Creative Studio">
            <Tabs defaultValue="build" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="build"><BookOpen className="mr-2 h-4 w-4" /> 1. Build Collection</TabsTrigger>
                    <TabsTrigger value="social"><Instagram className="mr-2 h-4 w-4" /> 2. Social Ad Studio</TabsTrigger>
                </TabsList>

                <TabsContent value="build">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="rounded-[24px] shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl font-black uppercase italic">Select Products</CardTitle>
                                    <CardDescription>Choose items from your "My Products" master list to feature.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                                    ) : products.length === 0 ? (
                                        <div className="text-center py-20 opacity-30">
                                            <LucideImage className="h-16 w-16 mx-auto mb-4" />
                                            <p className="font-bold uppercase text-xs text-slate-400">No products found in Master catalog</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                            {products.map(p => {
                                                const hasImage = p.imageDataUris && p.imageDataUris.length > 0;
                                                return (
                                                <div key={p.id} className={cn(
                                                    "flex items-center gap-4 p-3 border-2 rounded-2xl transition-all cursor-pointer",
                                                    selectedProductIds.includes(p.id) ? "border-primary bg-primary/5" : "hover:border-slate-300"
                                                )} onClick={() => {
                                                    if (selectedProductIds.includes(p.id)) setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                    else setSelectedProductIds(prev => [...prev, p.id]);
                                                }}>
                                                    <Checkbox checked={selectedProductIds.includes(p.id)} onCheckedChange={() => {}} />
                                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-slate-50 border">
                                                        {hasImage ? (
                                                            <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover" unoptimized />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-[8px] font-bold text-slate-300 uppercase">No Image</div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate uppercase italic text-slate-900">{p.title}</p>
                                                        <p className="text-xs font-bold text-primary">₹{p.price || p.costPrice}</p>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <Card className="rounded-[24px] shadow-lg border-primary/20 sticky top-24">
                                <CardHeader><CardTitle className="text-lg font-black uppercase italic">Identity</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Magazine Title</Label>
                                        <Input value={magazineTitle} onChange={e => setMagazineTitle(e.target.value)} className="font-bold h-11" placeholder="e.g. Winter Essentials" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Store Label</Label>
                                        <Input value={vendorTitle} onChange={e => setVendorTitle(e.target.value)} className="font-bold h-11" placeholder="Brand Name" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Logo</Label>
                                        <div className="flex gap-4 items-center">
                                            <div className="w-14 h-14 border-2 rounded-2xl bg-white overflow-hidden relative shrink-0 shadow-inner flex items-center justify-center">
                                                {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain p-1" unoptimized /> : <LucideImage className="h-6 w-6 text-slate-100" />}
                                            </div>
                                            <Input type="file" className="text-[10px] h-8" onChange={handleLogoUpload} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Custom Slug</Label>
                                        <Input value={customSlug} onChange={e => setCustomSlug(e.target.value)} placeholder="my-collection" className="font-mono text-xs" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-bold uppercase italic tracking-tighter">Try-On Enabled</Label>
                                            <p className="text-[9px] text-muted-foreground">Allow virtual fitting for items.</p>
                                        </div>
                                        <Switch checked={isTryOnEnabled} onCheckedChange={setIsTryOnEnabled} />
                                    </div>
                                    <div className="pt-4 space-y-3">
                                        <Button onClick={handleGenerateLink} className="w-full h-12 font-black uppercase italic tracking-tighter" disabled={selectedProductIds.length === 0}>
                                            <Share2 className="mr-2 h-4 w-4" /> Save & Get Link
                                        </Button>
                                        {magazineLink && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                                <div className="flex gap-2">
                                                    <Input readOnly value={magazineLink} className="h-9 text-[10px] font-mono bg-slate-50" />
                                                    <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => { navigator.clipboard.writeText(magazineLink); toast({title: "Copied!"}); }}><Copy className="h-4 w-4" /></Button>
                                                </div>
                                                <Button variant="secondary" className="w-full h-10 font-bold bg-green-50 text-green-700 border-green-200" onClick={handleShareCollectionWhatsApp}>
                                                    <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="social">
                    <div className="space-y-8 max-w-6xl mx-auto pb-20">
                         <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden rounded-[32px]">
                            <CardContent className="p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">Ad Studio</h2>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3"><Label className="text-[10px] uppercase font-black">Brand Name</Label><Switch checked={showBrandText} onCheckedChange={setShowBrandText} /></div>
                                        <div className="flex items-center gap-3"><Label className="text-[10px] uppercase font-black">Watermark</Label><Switch checked={showWatermark} onCheckedChange={setShowWatermark} /></div>
                                    </div>
                                </div>
                                <div className="space-y-4 w-full md:w-80">
                                    <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Main Headline</Label>
                                    <Input value={globalAdHeadline} onChange={e => setGlobalAdHeadline(e.target.value)} className="bg-white/10 border-white/20 text-white font-black italic h-12 rounded-xl" />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {products.filter(p => selectedProductIds.includes(p.id)).map(p => {
                                const price = (p as any).price || (p as any).costPrice;
                                const qrLink = `${origin}/catalogue?id=${p.id}&sellerId=${user?.uid}`;
                                const hasImage = p.imageDataUris && p.imageDataUris.length > 0;
                                
                                return (
                                    <div key={p.id} className="space-y-6">
                                        {hasImage ? (
                                            <SocialAdCard 
                                                imageUrl={p.imageDataUris[0]}
                                                title={p.title}
                                                headline={globalAdHeadline}
                                                price={price}
                                                qrUrl={qrLink}
                                                logoDataUri={logoDataUri || undefined}
                                                showBrandText={showBrandText}
                                                brandName={vendorTitle}
                                                showWatermark={showWatermark}
                                                onCanvasUpdate={(url) => setGeneratedAdUrls(prev => ({...prev, [p.id]: url}))}
                                            />
                                        ) : (
                                            <Card className="aspect-square flex items-center justify-center bg-slate-50 border-2 border-dashed">
                                                <p className="font-black text-slate-300 uppercase italic">No Image</p>
                                            </Card>
                                        )}
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 font-bold h-11" onClick={() => {
                                                const url = generatedAdUrls[p.id];
                                                if (url) {
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = `ad_${p.id}.jpg`;
                                                    link.click();
                                                }
                                            }}><Download className="mr-2 h-4 w-4" /> Download</Button>
                                             <Button variant="secondary" className="h-11 w-11" onClick={() => {
                                                const msg = `Check this out: ${qrLink}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                            }}><MessageSquare className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
