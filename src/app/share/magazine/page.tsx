
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import type { SellerProduct } from '@/app/seller/ai-product-uploader/page';
import Image from 'next/image';
import { 
    Loader2, Share2, Copy, MessageSquare, BookOpen, 
    Percent, Factory, Edit, Wand2, PlusCircle, 
    ImagePlus, Image as LucideImage, Facebook, 
    Instagram, Download, QrCode, Trash2, Globe, Sparkles 
} from 'lucide-react';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialAdCard } from '@/components/social-ad-card';

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

export default function ShareMagazinePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Array<SellerProduct | ProductDrop>>([]);
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [magazineLink, setMagazineLink] = useState('');
    const [magazineTitle, setMagazineTitle] = useState('Our Latest Collection');
    const [customSlug, setCustomSlug] = useState('');
    const [vendorTitle, setVendorTitle] = useState('');
    const [discount, setDiscount] = useState<number>(0);
    const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
    
    // Social Studio States
    const [globalAdHeadline, setGlobalAdHeadline] = useState('Exclusive Limited Offer');
    const [showWatermark, setShowWatermark] = useState(true);
    const [showBrandText, setShowBrandText] = useState(true);
    const [generatedAdUrls, setGeneratedAdUrls] = useState<Record<string, string>>({});

    const userRole = useMemo(() => getCookie('userRole'), []);

    useEffect(() => {
        async function loadData() {
            if (!user) {
                setIsLoading(false);
                return;
            }
            try {
                let productsCollection: Array<SellerProduct | ProductDrop> = [];
                const currentRole = getCookie('userRole');
                
                if (currentRole === 'seller') {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    productsCollection = sellerProducts.filter(p => p.sellerId === user.uid);
                } else if (currentRole === 'vendor') {
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                    productsCollection = allDrops.filter(p => p.vendorId === user.uid);
                } else {
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                    productsCollection = allDrops;
                }
                
                setProducts(productsCollection.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                const allMagazines = await getCollection<Magazine>('smart_magazines');
                setMagazines(allMagazines);
                
                // Try to load brand logo from settings
                const settings = await getDocument<any>(currentRole === 'seller' ? 'seller_users' : 'vendors', user.uid);
                if (settings?.logoDataUri) setLogoDataUri(settings.logoDataUri);

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading products" });
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
            vendorTitle: vendorTitle || undefined
        };
        await saveDocument('smart_magazines', newMagazine, finalId);
        setMagazineLink(`${window.location.origin}/collection/${finalId}${discount > 0 ? `?discount=${discount}` : ''}`);
        toast({ title: 'Collection Saved & Linked!' });
    };

    const handleDownloadAll = () => {
        Object.entries(generatedAdUrls).forEach(([id, url]) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `ad_tile_${id}.jpg`;
            link.click();
        });
        toast({ title: "Downloading All Creatives" });
    };

    const handleShareCollectionWhatsApp = () => {
        if (!magazineLink) return;
        const msg = `Check out our new ${magazineTitle} here: ${magazineLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    };

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
                                    <CardDescription>Choose the items you want to feature in your magazine and social tiles.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                                    ) : products.length === 0 ? (
                                        <div className="text-center py-20 opacity-30">
                                            <LucideImage className="h-16 w-16 mx-auto mb-4" />
                                            <p className="font-bold uppercase text-xs">No products available to share</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                            {products.map(p => (
                                                <div key={p.id} className={cn(
                                                    "flex items-center gap-4 p-3 border-2 rounded-2xl transition-all cursor-pointer",
                                                    selectedProductIds.includes(p.id) ? "border-primary bg-primary/5" : "hover:border-slate-300"
                                                )} onClick={() => {
                                                    if (selectedProductIds.includes(p.id)) setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                    else setSelectedProductIds(prev => [...prev, p.id]);
                                                }}>
                                                    <Checkbox checked={selectedProductIds.includes(p.id)} />
                                                    <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0">
                                                        <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover" />
                                                    </div>
                                                    <div className="flex-1 truncate">
                                                        <p className="font-black text-sm truncate uppercase italic">{p.title}</p>
                                                        <p className="text-xs font-bold text-primary">₹{((p as any).price || (p as any).costPrice)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <Card className="rounded-[24px] shadow-lg border-primary/20 sticky top-24">
                                <CardHeader><CardTitle className="text-lg font-black uppercase italic">Collection Settings</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Title</Label>
                                        <Input value={magazineTitle} onChange={e => setMagazineTitle(e.target.value)} className="font-bold h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Custom URL Slug</Label>
                                        <Input value={customSlug} onChange={e => setCustomSlug(e.target.value)} placeholder="e.g. spring-sale" className="font-mono text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Discount Label (%)</Label>
                                        <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="font-bold" />
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
                                                    <MessageSquare className="mr-2 h-4 w-4" /> Share on WhatsApp
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
                                <div className="space-y-6 max-w-md">
                                    <div className="space-y-2">
                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Social Ad Studio</h2>
                                        <p className="text-slate-400 text-sm font-medium">Generate high-conversion visual tiles for Instagram, Facebook, and WhatsApp Status instantly.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-full border border-white/20">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary-foreground">Remove Watermark</Label>
                                            <Switch checked={!showWatermark} onCheckedChange={(val) => setShowWatermark(!val)} />
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-full border border-white/20">
                                            <Label className="text-[10px] font-black uppercase tracking-widest">Brand Name</Label>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-4 w-full md:w-80">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Global Ad Headline</Label>
                                        <Input value={globalAdHeadline} onChange={e => setGlobalAdHeadline(e.target.value)} className="bg-white/10 border-white/20 text-white font-black italic h-12 rounded-xl" />
                                    </div>
                                    <Button onClick={handleDownloadAll} size="lg" className="w-full h-14 bg-primary hover:bg-primary/90 font-black uppercase italic shadow-xl shadow-primary/20" disabled={selectedProductIds.length === 0}>
                                        <Download className="mr-2 h-6 w-6" /> Download All Tiles
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {products.filter(p => selectedProductIds.includes(p.id)).map(p => {
                                const price = (p as any).price || (p as any).costPrice;
                                const qrLink = `${window.location.origin}/catalogue?id=${p.id}&sellerId=${user?.uid}&sellerName=${encodeURIComponent(user?.displayName || 'Our Store')}`;
                                return (
                                    <div key={p.id} className="space-y-6 group">
                                        <SocialAdCard 
                                            imageUrl={p.imageDataUris[0]}
                                            title={p.title}
                                            headline={globalAdHeadline}
                                            price={price}
                                            qrUrl={qrLink}
                                            showWatermark={showWatermark}
                                            logoDataUri={logoDataUri || undefined}
                                            showBrandText={showBrandText}
                                            brandName={user?.displayName || 'Our Store'}
                                            onCanvasUpdate={(url) => setGeneratedAdUrls(prev => ({...prev, [p.id]: url}))}
                                        />
                                        <div className="flex gap-3 px-2">
                                            <Button variant="outline" className="flex-1 font-bold h-11 rounded-xl" onClick={() => {
                                                const url = generatedAdUrls[p.id];
                                                if (url) {
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = `ad_tile_${p.id}.jpg`;
                                                    link.click();
                                                }
                                            }}>
                                                <Download className="mr-2 h-4 w-4" /> Download
                                            </Button>
                                            <Button variant="secondary" className="h-11 w-11 rounded-xl shrink-0" onClick={() => {
                                                const msg = `Check out this ${p.title} at only ₹${price}! Click to order: ${qrLink}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                            }}>
                                                <MessageSquare className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedProductIds.length === 0 && (
                                <div className="col-span-full py-32 text-center border-4 border-dashed rounded-[40px] opacity-20 bg-slate-50">
                                    <Sparkles className="h-20 w-20 mx-auto mb-4 text-slate-400" />
                                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">Select products to generate visual creatives</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}

