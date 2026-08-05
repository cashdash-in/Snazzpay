
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
import { Loader2, Share2, Copy, MessageSquare, BookOpen, Percent, Factory, Edit, Wand2, PlusCircle, ImagePlus, Image as LucideImage, Facebook, Instagram, Download, QrCode, Trash2, Globe, Sparkles } from 'lucide-react';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { parseTextForMagazine } from '@/ai/flows/magazine-paste-parser';
import { MagazineCover } from '@/components/magazine-cover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialAdCard } from '@/components/social-ad-card';

const MAX_IMAGE_SIZE_PX = 800;

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
    const [globalAdHeadline, setGlobalAdHeadline] = useState('Limited Time Offer');
    const [showWatermark, setShowWatermark] = useState(true);
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
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
                if (userRole === 'seller') {
                    const sellerProducts = await getCollection<SellerProduct>('seller_products');
                    productsCollection = sellerProducts.filter(p => p.sellerId === user.uid);
                } else {
                    const allDrops = await getCollection<ProductDrop>('product_drops');
                    productsCollection = allDrops;
                }
                setProducts(productsCollection.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                const allMagazines = await getCollection<Magazine>('smart_magazines');
                setMagazines(allMagazines);
            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data" });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, toast, userRole]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLogoDataUri(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateLink = async () => {
        if (selectedProductIds.length === 0) return;
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
        toast({ title: 'Magazine Ready!' });
    };

    const handleDownloadAll = () => {
        Object.entries(generatedAdUrls).forEach(([id, url]) => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `ad_${id}.jpg`;
            link.click();
        });
        toast({ title: "Downloading All Creatives" });
    };

    return (
        <AppShell title="Creative & Magazine Studio">
            <Tabs defaultValue="build" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="build"><BookOpen className="mr-2 h-4 w-4" /> 1. Build Collection</TabsTrigger>
                    <TabsTrigger value="social"><Instagram className="mr-2 h-4 w-4" /> 2. Creative Studio</TabsTrigger>
                </TabsList>

                <TabsContent value="build">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select Products</CardTitle>
                                    <CardDescription>Choose items to include in your collection and creatives.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                            {products.map(p => (
                                                <div key={p.id} className="flex items-center gap-4 p-3 border rounded-xl hover:border-primary/50 transition-colors">
                                                    <Checkbox 
                                                        checked={selectedProductIds.includes(p.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) setSelectedProductIds(prev => [...prev, p.id]);
                                                            else setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                                                        }}
                                                    />
                                                    <Image src={p.imageDataUris[0]} alt={p.title} width={50} height={50} className="rounded object-cover" />
                                                    <div className="flex-1 truncate">
                                                        <p className="font-bold text-sm truncate">{p.title}</p>
                                                        <p className="text-xs text-muted-foreground">₹{((p as any).price || (p as any).costPrice)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Configure Magazine</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Collection Title</Label>
                                        <Input value={magazineTitle} onChange={e => setMagazineTitle(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Custom URL Slug</Label>
                                        <Input value={customSlug} onChange={e => setCustomSlug(e.target.value)} placeholder="summer-sale-2024" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Brand Logo</Label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 border rounded bg-muted flex items-center justify-center relative overflow-hidden">
                                                {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain" /> : <Factory className="h-6 w-6 text-muted-foreground" />}
                                            </div>
                                            <Input type="file" className="text-xs" onChange={handleLogoUpload} />
                                        </div>
                                    </div>
                                    <Button onClick={handleGenerateLink} className="w-full" disabled={selectedProductIds.length === 0}>
                                        <Share2 className="mr-2 h-4 w-4" /> Save Collection
                                    </Button>
                                    {magazineLink && (
                                        <div className="p-3 bg-muted rounded-lg space-y-2">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Collection Live At:</p>
                                            <div className="flex gap-2">
                                                <Input readOnly value={magazineLink} className="h-8 text-xs" />
                                                <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(magazineLink); toast({title: "Copied!"}); }}><Copy className="h-3 w-3" /></Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="social">
                    <div className="space-y-8 max-w-6xl mx-auto">
                        <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden">
                            <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="space-y-4 max-w-md">
                                    <h2 className="text-3xl font-black italic uppercase tracking-tight">Social Ad Studio</h2>
                                    <p className="text-slate-400 text-sm">Generate professional creative tiles for all selected products. Perfect for Instagram Stories and WhatsApp Status.</p>
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                                            <Label className="text-xs font-bold text-primary">Remove Watermark</Label>
                                            <Switch checked={!showWatermark} onCheckedChange={(val) => setShowWatermark(!val)} />
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
                                            <Label className="text-xs font-bold">Include Brand Logo</Label>
                                            <Switch checked={!!logoDataUri} disabled={!logoDataUri} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 w-full md:w-auto">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500">Global Ad Headline</Label>
                                        <Input value={globalAdHeadline} onChange={e => setGlobalAdHeadline(e.target.value)} className="bg-white/10 border-white/20 text-white font-bold" />
                                    </div>
                                    <Button onClick={handleDownloadAll} size="lg" className="w-full bg-primary hover:bg-primary/90 font-bold" disabled={selectedProductIds.length === 0}>
                                        <Download className="mr-2 h-5 w-5" /> Download All Tiles
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {products.filter(p => selectedProductIds.includes(p.id)).map(p => {
                                const price = (p as any).price || (p as any).costPrice;
                                return (
                                    <div key={p.id} className="space-y-4">
                                        <SocialAdCard 
                                            imageUrl={p.imageDataUris[0]}
                                            title={p.title}
                                            headline={globalAdHeadline}
                                            price={price}
                                            qrUrl={`${window.location.origin}/catalogue?id=${p.id}&sellerId=${user?.uid}`}
                                            showWatermark={showWatermark}
                                            logoDataUri={logoDataUri || undefined}
                                            showBrandText={true}
                                            brandName={user?.displayName || 'Our Store'}
                                            onCanvasUpdate={(url) => setGeneratedAdUrls(prev => ({...prev, [p.id]: url}))}
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={() => {
                                                const url = generatedAdUrls[p.id];
                                                if (url) {
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = `ad_${p.id}.jpg`;
                                                    link.click();
                                                }
                                            }}>
                                                <Download className="mr-2 h-4 w-4" /> Download
                                            </Button>
                                            <Button variant="secondary" onClick={() => {
                                                const link = `${window.location.origin}/catalogue?id=${p.id}&sellerId=${user?.uid}`;
                                                const msg = `Check out this ${p.title} at ₹${price}! Link: ${link}`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                            }}>
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedProductIds.length === 0 && (
                                <div className="col-span-full py-20 text-center border-2 border-dashed rounded-3xl opacity-50">
                                    <LucideImage className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                                    <h3 className="text-xl font-bold uppercase italic">Select products to generate studio tiles</h3>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
