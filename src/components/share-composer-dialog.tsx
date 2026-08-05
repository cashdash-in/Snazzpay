
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { 
    Loader2, Wand2, Instagram, Facebook, 
    Copy, Sparkles, LayoutTemplate, 
    Image as LucideImage, Video, Music, 
    CheckCircle2, Info, Factory, Share2, 
    Youtube, Download, QrCode, Mic,
    Hash, MessageSquare, Pin
} from 'lucide-react';
import { createSocialAd } from '@/ai/flows/create-social-ad';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCookie } from 'cookies-next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { SocialAdCard } from './social-ad-card';

type ShareableProduct = {
    id: string;
    title: string;
    description: string;
    imageDataUris: string[];
    price?: number;
    costPrice?: number;
    vendorName?: string;
    vendorId?: string;
    sellerId?: string;
    sellerName?: string;
    allowedPaymentMethods?: string[];
};

interface ShareComposerDialogProps {
    product: ShareableProduct;
}

export function ShareComposerDialog({ product }: ShareComposerDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [adContent, setAdContent] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('campaign');
    const [adHeadline, setAdHeadline] = useState('Exclusive Collection');
    const [finalAdImage, setFinalAdImage] = useState<string | null>(null);
    const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
    const [showBrandText, setShowBrandText] = useState(true);
    const [showWatermark, setShowWatermark] = useState(true);

    const productPrice = useMemo(() => product.price || product.costPrice || 0, [product]);

    const getCatalogueLink = () => {
        const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const params = new URLSearchParams();
        params.set('id', product.id);
        const role = getCookie('userRole');
        if ((role === 'seller' || role === 'collaborator') && user) {
            params.set('sellerId', user.uid);
            params.set('sellerName', user.displayName || 'Seller');
        } else {
            const sellerId = product.sellerId || product.vendorId;
            const sellerName = product.sellerName || product.vendorName;
            if (sellerId && sellerName) {
                params.set('sellerId', sellerId);
                params.set('sellerName', sellerName);
            }
        }
        return `${currentUrl}/catalogue?${params.toString()}`;
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setLogoDataUri(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        try {
            const result = await createSocialAd({
                productTitle: product.title,
                productDescription: product.description,
                price: productPrice,
                brandName: user?.displayName || product.vendorName || 'Snazzify',
            });
            setAdContent(result);
            setAdHeadline(result.storyHeadline);
            toast({ title: "Campaign Kit Ready!" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Generation Failed" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} Copied!` });
    };

    return (
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none bg-white">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl"><Sparkles className="h-6 w-6 text-primary-foreground" /></div>
                    <div>
                        <DialogTitle className="text-xl font-black italic uppercase tracking-tight">Ad Studio</DialogTitle>
                        <DialogDescription className="text-slate-400">Professional scripts and creatives.</DialogDescription>
                    </div>
                </div>
                <Button onClick={handleGenerateAI} disabled={isGenerating} className="font-bold rounded-full px-6">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {adContent ? 'Regenerate Script' : 'Generate Ad Kit'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-100 border-b px-6 py-2">
                    <TabsList className="bg-transparent h-auto gap-4">
                        <TabsTrigger value="campaign" className="data-[state=active]:bg-white rounded-lg px-6 py-2 font-bold text-xs uppercase">Script</TabsTrigger>
                        <TabsTrigger value="visual" className="data-[state=active]:bg-white rounded-lg px-6 py-2 font-bold text-xs uppercase">Visual Tile</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="campaign" className="p-6 m-0 h-full">
                        {adContent ? (
                            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase flex items-center gap-2 border-b pb-4">
                                        <Mic className="text-primary h-6 w-6"/> Ad Script
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hook</p>
                                            <p className="text-sm italic font-bold">"{adContent.videoScript.hook}"</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Body</p>
                                            <p className="text-sm leading-relaxed">"{adContent.videoScript.body}"</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">CTA</p>
                                            <p className="text-sm font-black text-primary">"{adContent.videoScript.cta}"</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase border-b pb-4 text-slate-400">Storyboard</h3>
                                    <div className="space-y-4">
                                        {adContent.storyboard.map((slide: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-4 border rounded-2xl bg-white shadow-sm hover:border-primary/50 transition-colors group">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0">{i+1}</div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900 uppercase text-xs">{slide.headline}</p>
                                                    <p className="text-xs text-muted-foreground italic">"{slide.visualDescription}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-50"><Video className="h-16 w-16 mb-2"/><p>Generate ad kit to see scripts</p></div>
                        )}
                    </TabsContent>

                    <TabsContent value="visual" className="p-6 m-0 h-full">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
                            <div className="space-y-6">
                                <div className="border-b pb-4">
                                    <h3 className="text-2xl font-black italic uppercase">Visual Ad Studio</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Main Headline</Label>
                                        <Input value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="font-bold rounded-xl h-12" />
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold">Remove Watermark</Label>
                                            <Switch checked={!showWatermark} onCheckedChange={(val) => setShowWatermark(!val)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold">Display Brand Name</Label>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-bold text-slate-400">Brand Logo</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 border rounded bg-white overflow-hidden relative shrink-0">
                                                    {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain p-1" /> : <LucideImage className="h-6 w-6 m-auto text-slate-200" />}
                                                </div>
                                                <Input type="file" className="text-xs" onChange={handleLogoUpload} />
                                            </div>
                                        </div>
                                    </div>
                                    {finalAdImage && (
                                        <a href={finalAdImage} download={`${product.title}_ad.jpg`} className="w-full block">
                                            <Button size="lg" className="w-full h-14 text-lg font-black shadow-xl rounded-2xl">
                                                <Download className="mr-2 h-5 w-5" /> Download Ad Tile
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <SocialAdCard 
                                    imageUrl={product.imageDataUris[0]}
                                    title={product.title}
                                    headline={adHeadline}
                                    price={productPrice}
                                    qrUrl={getCatalogueLink()}
                                    brandName={user?.displayName || product.vendorName}
                                    logoDataUri={logoDataUri || undefined}
                                    showBrandText={showBrandText}
                                    showWatermark={showWatermark}
                                    onCanvasUpdate={setFinalAdImage}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            <footer className="bg-slate-50 border-t p-4 flex justify-end shrink-0">
                <DialogClose asChild><Button variant="ghost" className="rounded-xl px-8 font-bold uppercase text-[10px]">Exit Studio</Button></DialogClose>
            </footer>
        </DialogContent>
    );
}
