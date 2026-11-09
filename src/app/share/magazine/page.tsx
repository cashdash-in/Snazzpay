'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { 
    Loader2, Share2, Copy, MessageSquare, BookOpen, 
    Wand2, ImagePlus, Image as LucideImage, 
    Instagram, Download, Video,
    Zap
} from 'lucide-react';
import { getCollection, saveDocument, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    
    const [mounted, setMounted] = useState(false);
    const [origin, setOrigin] = useState('');

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
                const partnerId = getCookie('snapstock_token');
                
                const [sellerProducts, productDrops, inventoryItems] = await Promise.all([
                    getCollection<any>('seller_products'),
                    getCollection<any>('product_drops'),
                    getCollection<any>('inventory')
                ]);

                const uniqueMap = new Map();
                
                // 1. Drops
                productDrops.forEach(p => { if (p?.id) uniqueMap.set(p.id, { ...p, sourceType: 'drop' }); });

                // 2. Seller products
                sellerProducts.forEach(p => { if (p?.id) uniqueMap.set(p.id, { ...p, sourceType: 'seller' }); });

                // 3. Partner Inventory (The missing piece)
                inventoryItems.forEach(p => { 
                    if (p?.id) {
                        uniqueMap.set(p.id, { 
                            ...p, 
                            title: p.name || p.title, 
                            price: p.mrp || p.price, 
                            sourceType: 'inventory' 
                        }); 
                    }
                });

                let finalProducts = Array.from(uniqueMap.values());

                // Intelligent Filtering
                if (currentRole === 'snapstock_partner' && partnerId) {
                    finalProducts = finalProducts.filter(p => p.storeId === partnerId || p.sourceType === 'drop');
                } else if (currentRole !== 'admin') {
                    finalProducts = finalProducts.filter(p => 
                        p.sellerId === user.uid || p.vendorId === user.uid
                    );
                }
                
                setProducts(finalProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                
                const settings = await getDocument<any>(currentRole === 'seller' ? 'seller_users' : 'vendors', user.uid);
                if (settings?.logoDataUri) {
                    setLogoDataUri(settings.logoDataUri);
                    setVendorTitle(settings.companyName || settings.name || '');
                }

            } catch (error: any) {
                console.error("Magazine loadData error:", error);
                toast({ variant: 'destructive', title: "Fetch Error" });
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
        toast({ title: 'Collection Saved!' });
    };

    if (!mounted) return null;

    return (
        <AppShell title="Marketing Studio">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[24px] shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-black uppercase italic">Master Selection</CardTitle>
                            <CardDescription>Choose items from your catalog to include in this magazine.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
                            ) : products.length === 0 ? (
                                <div className="text-center py-20 opacity-30">
                                    <LucideImage className="h-16 w-16 mx-auto mb-4" />
                                    <p className="font-bold uppercase text-xs">No products found in catalog</p>
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
                                            <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 bg-slate-50 border">
                                                <Image src={p.imageDataUri || p.imageDataUris?.[0] || 'https://picsum.photos/seed/placeholder/100/100'} alt={p.title} fill className="object-cover" unoptimized />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm truncate uppercase italic text-slate-900">{p.title}</p>
                                                <p className="text-xs font-bold text-primary">₹{p.price || p.mrp || p.costPrice}</p>
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
                        <CardHeader><CardTitle className="text-lg font-black uppercase italic">Settings</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Magazine Title</Label>
                                <Input value={magazineTitle} onChange={e => setMagazineTitle(e.target.value)} className="font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Brand Name</Label>
                                <Input value={vendorTitle} onChange={e => setVendorTitle(e.target.value)} className="font-bold" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold uppercase italic">Try-On Enabled</Label>
                                    <p className="text-[9px] text-muted-foreground">Allow virtual fitting for items.</p>
                                </div>
                                <Switch checked={isTryOnEnabled} onCheckedChange={setIsTryOnEnabled} />
                            </div>
                            <Button onClick={handleGenerateLink} className="w-full h-12 font-black uppercase italic" disabled={selectedProductIds.length === 0}>
                                <Share2 className="mr-2 h-4 w-4" /> Get Smart Link
                            </Button>
                            {magazineLink && (
                                <div className="space-y-2 pt-4 border-t animate-in slide-in-from-bottom-2">
                                    <div className="flex gap-2">
                                        <Input readOnly value={magazineLink} className="h-9 text-[10px] font-mono" />
                                        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => { navigator.clipboard.writeText(magazineLink); toast({title: "Copied!"}); }}><Copy className="h-4 w-4" /></Button>
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(magazineLink)}`, '_blank')}>
                                        <MessageSquare className="mr-2 h-4 w-4" /> Share WhatsApp
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
