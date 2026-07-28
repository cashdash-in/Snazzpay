
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
    Youtube, Download, QrCode, Mic
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
    const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'pinterest'>('instagram');
    const [activeTab, setActiveTab] = useState('campaign');
    const [adHeadline, setAdHeadline] = useState('A Story of Style');
    const [finalAdImage, setFinalAdImage] = useState<string | null>(null);
    const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
    const [showBrandText, setShowBrandText] = useState(false);

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
            toast({ title: "Campaign Kit Ready!", description: "High-impact copy and storyboard generated." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyScript = () => {
        if (!adContent) return;
        const script = `HOOK: ${adContent.videoScript.hook}\nBODY: ${adContent.videoScript.body}\nCTA: ${adContent.videoScript.cta}\nMUSIC STYLE: ${adContent.videoScript.musicStyle}`;
        navigator.clipboard.writeText(script);
        toast({ title: "Script Copied!" });
    };

    return (
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none bg-white">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl">Professional Campaign Studio</DialogTitle>
                        <DialogDescription className="text-slate-400">Design pro ads and storytelling scripts.</DialogDescription>
                    </div>
                </div>
                <Button onClick={handleGenerateAI} disabled={isGenerating} className="font-bold">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {adContent ? 'Regenerate Campaign' : 'Start AI Campaign'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-100 border-b px-6 py-2">
                    <TabsList className="bg-transparent h-auto gap-4">
                        <TabsTrigger value="campaign" className="data-[state=active]:bg-white rounded-lg px-6 py-2">
                            <LayoutTemplate className="mr-2 h-4 w-4" /> 1. Story & Script
                        </TabsTrigger>
                        <TabsTrigger value="visual" className="data-[state=active]:bg-white rounded-lg px-6 py-2">
                            <LucideImage className="mr-2 h-4 w-4" /> 2. Visual Ad Tile
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="campaign" className="p-6 m-0 h-full">
                        {!adContent ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                <Video className="h-16 w-16 text-slate-300" />
                                <div>
                                    <h3 className="text-xl font-bold">Your AI Campaign is Ready to be Born</h3>
                                    <p className="text-sm">Click the button above to generate a professional storyboard and script.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-2xl font-black italic uppercase flex items-center gap-2">
                                            <Mic className="text-primary h-6 w-6"/> Production Script
                                        </h3>
                                        <Button size="sm" variant="outline" onClick={handleCopyScript}><Copy className="h-3 w-3 mr-2"/>Copy Script</Button>
                                    </div>
                                    <div className="space-y-4">
                                        <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
                                            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs uppercase text-blue-600">The Hook (0-5s)</CardTitle></CardHeader>
                                            <CardContent className="p-4 pt-0 text-sm font-medium">"{adContent.videoScript.hook}"</CardContent>
                                        </Card>
                                        <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
                                            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs uppercase text-purple-600">The Story (5-25s)</CardTitle></CardHeader>
                                            <CardContent className="p-4 pt-0 text-sm italic">"{adContent.videoScript.body}"</CardContent>
                                        </Card>
                                        <Card className="border-l-4 border-l-green-500 bg-green-50/30">
                                            <CardHeader className="p-4 pb-2"><CardTitle className="text-xs uppercase text-green-600">Call to Action (25-30s)</CardTitle></CardHeader>
                                            <CardContent className="p-4 pt-0 text-sm font-bold">"{adContent.videoScript.cta}"</CardContent>
                                        </Card>
                                        <div className="flex items-center gap-2 p-3 bg-slate-900 text-white rounded-xl text-xs">
                                            <Music className="h-4 w-4 text-primary" />
                                            <span className="font-bold">MUSIC VIBE:</span> {adContent.videoScript.musicStyle}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase flex items-center gap-2">
                                        <LucideImage className="text-primary h-6 w-6"/> 3-Part Storyboard
                                    </h3>
                                    <div className="space-y-4">
                                        {adContent.storyboard.map((slide: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-4 border rounded-2xl bg-white shadow-sm hover:border-primary/50 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0">{i+1}</div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900">{slide.headline}</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{slide.visualDescription}</p>
                                                    <Badge variant="secondary" className="text-[9px] mt-2 uppercase">{slide.subtext}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="visual" className="p-6 m-0 h-full">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase">Social Ad Tile</h3>
                                    <p className="text-slate-500 text-sm">Download a professional graphic with your QR code.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-slate-400">Headline</Label>
                                        <Input value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="font-bold"/>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed space-y-4">
                                        <Label className="font-bold flex items-center gap-2 text-xs uppercase"><Factory className="h-4 w-4" /> Brand Identity</Label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 border rounded-xl flex items-center justify-center bg-white overflow-hidden relative shadow-sm">
                                                {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain p-1" /> : <LucideImage className="h-6 w-6 text-slate-300" />}
                                            </div>
                                            <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs flex-1 h-9" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold">Show Brand Name Text</Label>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                    </div>
                                    {finalAdImage && (
                                        <a href={finalAdImage} download={`${product.title}_ad.jpg`} className="w-full block">
                                            <Button size="lg" className="w-full h-14 text-lg font-black shadow-lg rounded-xl">
                                                <Download className="mr-2 h-5 w-5" /> Download Ad Tile
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center">
                                <div className="scale-[0.8] origin-top">
                                    <SocialAdCard 
                                        imageUrl={product.imageDataUris[0]}
                                        title={product.title}
                                        headline={adHeadline}
                                        price={productPrice}
                                        qrUrl={getCatalogueLink()}
                                        brandName={user?.displayName || product.vendorName}
                                        logoDataUri={logoDataUri || undefined}
                                        showBrandText={showBrandText}
                                        allowedPaymentMethods={product.allowedPaymentMethods}
                                        onCanvasUpdate={setFinalAdImage}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

            <footer className="bg-slate-50 border-t p-4 flex justify-end gap-2 shrink-0">
                <DialogClose asChild><Button variant="outline" className="rounded-xl px-8">Close Studio</Button></DialogClose>
            </footer>
        </DialogContent>
    );
}
