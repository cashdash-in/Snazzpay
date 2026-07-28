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
            toast({ title: "Campaign Kit Ready!", description: "Copy and posting tools are now active." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: error.message });
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
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-black italic uppercase tracking-tight">Campaign Studio</DialogTitle>
                        <DialogDescription className="text-slate-400">Cinematic scripts and posting kits for social media.</DialogDescription>
                    </div>
                </div>
                <Button onClick={handleGenerateAI} disabled={isGenerating} className="font-bold rounded-full px-6">
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {adContent ? 'Regenerate Kit' : 'Generate Full Kit'}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-100 border-b px-6 py-2">
                    <TabsList className="bg-transparent h-auto gap-4">
                        <TabsTrigger value="campaign" className="data-[state=active]:bg-white rounded-lg px-6 py-2 font-bold text-xs uppercase">
                            <LayoutTemplate className="mr-2 h-4 w-4" /> 1. Narrative & Script
                        </TabsTrigger>
                        <TabsTrigger value="posting" className="data-[state=active]:bg-white rounded-lg px-6 py-2 font-bold text-xs uppercase">
                            <Share2 className="mr-2 h-4 w-4" /> 2. Platform Posting Kit
                        </TabsTrigger>
                        <TabsTrigger value="visual" className="data-[state=active]:bg-white rounded-lg px-6 py-2 font-bold text-xs uppercase">
                            <LucideImage className="mr-2 h-4 w-4" /> 3. Visual Ad Tile
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <TabsContent value="campaign" className="p-6 m-0 h-full">
                        {!adContent ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                <Video className="h-16 w-16 text-slate-300" />
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold italic uppercase">Your Story Starts Here</h3>
                                    <p className="text-sm">Click "Generate Full Kit" to create a professional narrative.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center border-b pb-4">
                                        <h3 className="text-2xl font-black italic uppercase flex items-center gap-2">
                                            <Mic className="text-primary h-6 w-6"/> Production Script
                                        </h3>
                                        <Button size="sm" variant="outline" onClick={() => handleCopyText(`${adContent.videoScript.hook}\n${adContent.videoScript.body}\n${adContent.videoScript.cta}`, "Full Script")} className="rounded-full">
                                            <Copy className="h-3 w-3 mr-2"/>Copy Script
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50/50 rounded-r-xl">
                                            <p className="text-[10px] font-black uppercase text-blue-600 mb-1 tracking-widest">The Hook (0-5s)</p>
                                            <p className="text-sm font-bold italic">"{adContent.videoScript.hook}"</p>
                                        </div>
                                        <div className="p-4 border-l-4 border-l-purple-500 bg-purple-50/50 rounded-r-xl">
                                            <p className="text-[10px] font-black uppercase text-purple-600 mb-1 tracking-widest">The Story (5-25s)</p>
                                            <p className="text-sm font-medium leading-relaxed">"{adContent.videoScript.body}"</p>
                                        </div>
                                        <div className="p-4 border-l-4 border-l-green-500 bg-green-50/50 rounded-r-xl">
                                            <p className="text-[10px] font-black uppercase text-green-600 mb-1 tracking-widest">Call to Action (25-30s)</p>
                                            <p className="text-sm font-black">"{adContent.videoScript.cta}"</p>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-slate-900 text-white rounded-xl text-xs border border-white/10 shadow-lg">
                                            <Music className="h-4 w-4 text-primary animate-pulse" />
                                            <span className="font-black italic uppercase text-primary">Audio Direction:</span> {adContent.videoScript.musicStyle}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black italic uppercase flex items-center gap-2 border-b pb-4 text-slate-400">
                                        <LucideImage className="h-6 w-6"/> Visual Storyboard
                                    </h3>
                                    <div className="space-y-4">
                                        {adContent.storyboard.map((slide: any, i: number) => (
                                            <div key={i} className="flex gap-4 p-4 border rounded-2xl bg-white shadow-sm hover:border-primary/50 transition-colors group">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">{i+1}</div>
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900 uppercase text-xs tracking-tight">{slide.headline}</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed italic">"{slide.visualDescription}"</p>
                                                    <Badge variant="outline" className="text-[8px] mt-2 border-primary/20 text-primary font-black uppercase tracking-widest">{slide.subtext}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="posting" className="p-6 m-0 h-full">
                        {!adContent ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                <Share2 className="h-16 w-16 text-slate-300" />
                                <h3 className="text-xl font-bold italic uppercase">Posting Kit Pending</h3>
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Instagram Kit */}
                                    <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2 text-pink-700">
                                                <Instagram className="h-5 w-5" /> Instagram Kit
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-pink-600">Caption</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-pink-600" onClick={() => handleCopyText(adContent.platforms.instagram.caption, "Caption")}><Copy className="h-3 w-3"/></Button></div>
                                                <div className="p-3 bg-white/60 rounded-xl text-xs leading-relaxed border border-pink-100">{adContent.platforms.instagram.caption}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-pink-600">Hashtags</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-pink-600" onClick={() => handleCopyText(adContent.platforms.instagram.hashtags.join(' '), "Hashtags")}><Copy className="h-3 w-3"/></Button></div>
                                                <div className="flex flex-wrap gap-1">
                                                    {adContent.platforms.instagram.hashtags.map((tag: string, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="bg-white text-[9px] border-pink-100">{tag}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-900 text-white rounded-xl text-[10px] flex items-start gap-2">
                                                <Sparkles className="h-3 w-3 text-pink-400 shrink-0 mt-0.5" />
                                                <span><strong className="text-pink-400 uppercase">Pro Tip:</strong> {adContent.platforms.instagram.postingTip}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Facebook Kit */}
                                    <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                                                <Facebook className="h-5 w-5" /> Facebook Ad Kit
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-blue-600">Headline</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => handleCopyText(adContent.platforms.facebook.headline, "Headline")}><Copy className="h-3 w-3"/></Button></div>
                                                <p className="p-3 bg-white/60 rounded-xl text-xs font-bold border border-blue-100">{adContent.platforms.facebook.headline}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-blue-600">Post Body</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => handleCopyText(adContent.platforms.facebook.postBody, "Post Body")}><Copy className="h-3 w-3"/></Button></div>
                                                <div className="p-3 bg-white/60 rounded-xl text-xs leading-relaxed border border-blue-100 h-32 overflow-y-auto">{adContent.platforms.facebook.postBody}</div>
                                            </div>
                                            <div className="p-3 bg-white rounded-xl border border-blue-200 text-center">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Recommended CTA</Label>
                                                <p className="text-sm font-black text-blue-700">{adContent.platforms.facebook.callToAction}</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Pinterest Kit */}
                                    <Card className="border-none shadow-xl bg-gradient-to-br from-red-50 to-orange-50">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                                                <MessageSquare className="h-5 w-5" /> Pinterest Pin Kit
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-red-600">Pin Title</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => handleCopyText(adContent.platforms.pinterest.title, "Title")}><Copy className="h-3 w-3"/></Button></div>
                                                <p className="p-3 bg-white/60 rounded-xl text-xs font-bold border border-red-100 italic">"{adContent.platforms.pinterest.title}"</p>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center"><Label className="text-[10px] font-black uppercase text-red-600">SEO Description</Label><Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => handleCopyText(adContent.platforms.pinterest.description, "Description")}><Copy className="h-3 w-3"/></Button></div>
                                                <div className="p-3 bg-white/60 rounded-xl text-xs leading-relaxed border border-red-100 h-24 overflow-y-auto">{adContent.platforms.pinterest.description}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-black uppercase text-red-600">Keywords</Label>
                                                <div className="flex flex-wrap gap-1">
                                                    {adContent.platforms.pinterest.keywords.map((kw: string, idx: number) => (
                                                        <Badge key={idx} variant="outline" className="bg-white text-[9px] border-red-100">{kw}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="visual" className="p-6 m-0 h-full">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
                            <div className="space-y-6">
                                <div className="border-b pb-4">
                                    <h3 className="text-2xl font-black italic uppercase">Visual Ad Tile</h3>
                                    <p className="text-slate-500 text-sm">Download a professional graphic with your direct order QR code.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Main Headline</Label>
                                        <Input value={adHeadline} onChange={e => setAdHeadline(e.target.value)} className="font-bold border-2 rounded-xl h-12 focus-visible:ring-primary"/>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200 space-y-6">
                                        <Label className="font-black flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-600"><Factory className="h-4 w-4" /> Brand Identity</Label>
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 border-2 border-white rounded-[20px] flex items-center justify-center bg-white overflow-hidden relative shadow-lg">
                                                {logoDataUri ? <Image src={logoDataUri} alt="logo" fill className="object-contain p-2" /> : <LucideImage className="h-8 w-8 text-slate-200" />}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs h-10 rounded-xl cursor-pointer" />
                                                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight">Upload brand logo for the ad corner</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <Label className="text-xs font-bold text-slate-700">Display Brand Name Text</Label>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                    </div>
                                    {finalAdImage && (
                                        <div className="pt-4">
                                            <a href={finalAdImage} download={`${product.title.replace(/\s+/g, '_')}_ad.jpg`} className="w-full block">
                                                <Button size="lg" className="w-full h-16 text-lg font-black shadow-2xl rounded-2xl bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                    <Download className="mr-2 h-6 w-6" /> Download JPG Ad Tile
                                                </Button>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-center items-start pt-4">
                                <div className="scale-[0.85] origin-top shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] rounded-2xl">
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
                <DialogClose asChild><Button variant="ghost" className="rounded-xl px-8 font-bold uppercase text-[10px]">Exit Studio</Button></DialogClose>
            </footer>
        </DialogContent>
    );
}
