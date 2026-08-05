
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
    const [adHeadline, setAdHeadline] = useState('New Stock Available!');
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
        
        if (user) {
            params.set('sellerId', user.uid);
            params.set('sellerName', user.displayName || 'Our Store');
        } else {
            const sellerId = product.sellerId || product.vendorId;
            const sellerName = product.sellerName || product.vendorName;
            if (sellerId) params.set('sellerId', sellerId);
            if (sellerName) params.set('sellerName', sellerName);
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
            toast({ title: "Social Kit Ready!" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "AI Studio error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} Copied!` });
    };

    const shareWhatsApp = () => {
        const link = getCatalogueLink();
        const text = `Check out this amazing *${product.title}* at ₹${productPrice}!\n\nOrder here: ${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareFacebook = () => {
        const link = getCatalogueLink();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
    };

    return (
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 border-none bg-white rounded-[32px] overflow-hidden">
            <div className="bg-slate-900 p-6 text-white flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl"><Sparkles className="h-6 w-6 text-primary-foreground" /></div>
                    <div>
                        <DialogTitle className="text-xl font-black italic uppercase tracking-tight">Social Ad Studio</DialogTitle>
                        <DialogDescription className="text-slate-400">Viral content for {product.title}</DialogDescription>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => handleCopyText(getCatalogueLink(), "Link")}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Order Link
                    </Button>
                    <Button onClick={handleGenerateAI} disabled={isGenerating} className="font-bold rounded-full px-6 bg-primary">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        {adContent ? 'Regenerate Content' : 'Start AI Studio'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-50 border-b px-6 py-2">
                    <TabsList className="bg-transparent h-auto gap-4">
                        <TabsTrigger value="campaign" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 font-bold text-xs uppercase">1. Ad Script</TabsTrigger>
                        <TabsTrigger value="visual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 font-bold text-xs uppercase">2. Visual Tile</TabsTrigger>
                        <TabsTrigger value="platforms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2 font-bold text-xs uppercase">3. Share Now</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="campaign" className="p-8 m-0 h-full">
                        {adContent ? (
                            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase flex items-center gap-2 border-b pb-4 text-slate-800">
                                        <Mic className="text-primary h-6 w-6"/> Video/Reel Script
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Hook (0-5s)</p>
                                            <p className="text-sm italic font-bold">"{adContent.videoScript.hook}"</p>
                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyText(adContent.videoScript.hook, "Hook")}><Copy className="h-3 w-3"/></Button>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 relative group">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Story & Value (5-25s)</p>
                                            <p className="text-sm leading-relaxed">"{adContent.videoScript.body}"</p>
                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyText(adContent.videoScript.body, "Body")}><Copy className="h-3 w-3"/></Button>
                                        </div>
                                        <div className="p-5 bg-primary/5 rounded-2xl border-2 border-primary/10 relative group">
                                            <p className="text-[10px] font-black uppercase text-primary/40 mb-1 tracking-widest">Call to Action (25-30s)</p>
                                            <p className="text-sm font-black text-primary italic">"{adContent.videoScript.cta}"</p>
                                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleCopyText(adContent.videoScript.cta, "CTA")}><Copy className="h-3 w-3"/></Button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pt-4">
                                            <Music className="h-4 w-4"/> Music Style: <span className="text-primary italic">{adContent.videoScript.musicStyle}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase border-b pb-4 text-slate-400">Storyboard</h3>
                                    <div className="space-y-4">
                                        {adContent.storyboard.map((slide: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-5 border-2 rounded-[24px] bg-white shadow-sm hover:border-primary/50 transition-all group">
                                                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center font-black text-white italic shrink-0">{i+1}</div>
                                                <div className="space-y-1">
                                                    <p className="font-black text-slate-900 uppercase italic text-sm">{slide.headline}</p>
                                                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{slide.visualDescription}"</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                                <Video className="h-20 w-20 text-slate-300"/>
                                <p className="font-black uppercase italic text-xl tracking-tighter">Click "Start AI Studio" to generate viral content</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="visual" className="p-8 m-0 h-full">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">Tile Designer</h3>
                                    <p className="text-muted-foreground text-sm font-medium">Customize the visual appearance of your creative tile.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Main Headline</Label>
                                        <Input value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="font-black italic rounded-xl h-14 text-lg border-2" />
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-200 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase italic tracking-widest text-primary">Remove Watermark</Label>
                                            <Switch checked={!showWatermark} onCheckedChange={(val) => setShowWatermark(!val)} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-black uppercase italic tracking-widest">Show Brand Name</Label>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Upload Custom Logo</Label>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-16 h-16 border-2 rounded-2xl bg-white overflow-hidden relative shrink-0 shadow-inner flex items-center justify-center">
                                                    {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain p-1" /> : <LucideImage className="h-8 w-8 text-slate-100" />}
                                                </div>
                                                <Input type="file" className="text-xs rounded-xl" onChange={handleLogoUpload} />
                                            </div>
                                        </div>
                                    </div>
                                    {finalAdImage && (
                                        <a href={finalAdImage} download={`${product.title}_ad_tile.jpg`} className="w-full block transform hover:scale-[1.02] transition-transform">
                                            <Button size="lg" className="w-full h-16 text-xl font-black uppercase italic shadow-2xl shadow-primary/30 rounded-2xl">
                                                <Download className="mr-2 h-6 w-6" /> Download JPG Tile
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center animate-in zoom-in-95 duration-500">
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

                    <TabsContent value="platforms" className="p-8 m-0 h-full">
                        {adContent ? (
                            <div className="max-w-5xl mx-auto space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="rounded-[32px] border-none bg-gradient-to-br from-purple-50 to-pink-50 p-6 space-y-4">
                                        <Instagram className="h-8 w-8 text-pink-600"/>
                                        <h4 className="font-black italic uppercase text-lg">Instagram Reel</h4>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-white/50 rounded-xl text-xs italic">"{adContent.platforms.instagram.caption}"</div>
                                            <div className="flex flex-wrap gap-1">
                                                {adContent.platforms.instagram.hashtags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[9px] font-bold">#{tag}</Badge>)}
                                            </div>
                                            <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase rounded-lg" onClick={() => handleCopyText(adContent.platforms.instagram.caption, "Caption")}>Copy Caption</Button>
                                        </div>
                                    </Card>

                                    <Card className="rounded-[32px] border-none bg-gradient-to-br from-blue-50 to-indigo-50 p-6 space-y-4">
                                        <Facebook className="h-8 w-8 text-blue-600"/>
                                        <h4 className="font-black italic uppercase text-lg">Facebook Ad</h4>
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase text-blue-800">Headline: {adContent.platforms.facebook.headline}</p>
                                            <div className="p-3 bg-white/50 rounded-xl text-xs">"{adContent.platforms.facebook.postBody}"</div>
                                            <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase rounded-lg" onClick={() => handleCopyText(adContent.platforms.facebook.postBody, "Post Body")}>Copy Post</Button>
                                        </div>
                                    </Card>

                                    <Card className="rounded-[32px] border-none bg-gradient-to-br from-red-50 to-orange-50 p-6 space-y-4">
                                        <Pin className="h-8 w-8 text-red-600"/>
                                        <h4 className="font-black italic uppercase text-lg">Pinterest Pin</h4>
                                        <div className="space-y-3">
                                            <p className="font-bold text-xs">{adContent.platforms.pinterest.title}</p>
                                            <div className="p-3 bg-white/50 rounded-xl text-xs italic">"{adContent.platforms.pinterest.description}"</div>
                                            <Button variant="outline" className="w-full h-9 text-[10px] font-black uppercase rounded-lg" onClick={() => handleCopyText(adContent.platforms.pinterest.description, "Pin Description")}>Copy Description</Button>
                                        </div>
                                    </Card>
                                </div>
                                <div className="pt-8 border-t flex flex-col items-center gap-6">
                                    <h3 className="text-xl font-black uppercase italic tracking-widest text-slate-400 text-center">Quick Send Order Links</h3>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        <Button onClick={shareWhatsApp} className="h-14 px-8 bg-green-600 hover:bg-green-700 rounded-full font-black uppercase tracking-tighter">
                                            <MessageSquare className="mr-2 h-6 w-6"/> WhatsApp
                                        </Button>
                                        <Button onClick={shareFacebook} className="h-14 px-8 bg-blue-600 hover:bg-blue-700 rounded-full font-black uppercase tracking-tighter">
                                            <Facebook className="mr-2 h-6 w-6"/> Facebook
                                        </Button>
                                        <Button onClick={() => handleCopyText(getCatalogueLink(), "Catalogue Link")} variant="secondary" className="h-14 px-8 rounded-full font-black uppercase tracking-tighter">
                                            <Instagram className="mr-2 h-6 w-6"/> Instagram Link
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                                <Share2 className="h-20 w-20 text-slate-300"/>
                                <p className="font-black uppercase italic text-xl tracking-tighter">Generate ad kit to unlock platform specific sharing</p>
                            </div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>

            <footer className="bg-slate-50 border-t p-4 flex justify-end shrink-0">
                <DialogClose asChild><Button variant="ghost" className="rounded-xl px-8 font-bold uppercase text-[10px]">Close Ad Studio</Button></DialogClose>
            </footer>
        </DialogContent>
    );
}

