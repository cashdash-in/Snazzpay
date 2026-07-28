'use client';

import { useState, useEffect, useMemo } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { 
    Loader2, Wand2, AlertTriangle, Facebook, Instagram, 
    MessageSquare, Download, Share2, Youtube, MapPin, 
    Image as LucideImage, LayoutTemplate, Copy, Globe, QrCode, Sparkles, Clock, CheckCircle2, Info, Factory, Trash2
} from 'lucide-react';
import { createSocialAd } from '@/ai/flows/create-social-ad';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { getCookie } from 'cookies-next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialAdCard } from './social-ad-card';
import { Badge } from './ui/badge';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

type ShareableProduct = {
    id: string;
    title: string;
    description: string;
    imageDataUris: string[];
    costPrice?: number;
    price?: number;
    category?: string;
    vendorName?: string;
    vendorId?: string;
    sellerId?: string;
    sellerName?: string;
    sizes?: string[];
    colors?: string[];
    allowedPaymentMethods?: string[];
};

interface ShareComposerDialogProps {
    product: ShareableProduct;
}

export function ShareComposerDialog({ product }: ShareComposerDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [appUrl, setAppUrl] = useState('');
    const [adContent, setAdContent] = useState<any>(null);
    const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'pinterest' | 'youtube'>('instagram');
    const [activeTab, setActiveTab] = useState('text');
    const [adHeadline, setAdHeadline] = useState('A Story of Style');
    const [finalAdImage, setFinalAdImage] = useState<string | null>(null);
    const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
    const [showBrandText, setShowBrandText] = useState(false); // Default to false to hide "Super Admin"

    const productPrice = useMemo(() => product.price || product.costPrice || 0, [product]);
    const isPriceValid = productPrice > 0;

    const getCatalogueLink = () => {
        const currentUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
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

    useEffect(() => {
        const currentUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setAppUrl(currentUrl);
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setLogoDataUri(ev.target?.result as string);
                toast({ title: "Logo Added!", description: "It will now appear on your ad tile." });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateAIAd = async () => {
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
            
            toast({
                title: "Posting Kit Generated!",
                description: "Optimized content for all platforms is ready.",
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyAll = () => {
        if (!adContent) return;
        const link = getCatalogueLink();
        const content = adContent.platforms[activePlatform];
        let text = "";

        if (activePlatform === 'instagram') {
            text = `${content.caption}\n\nPrice: ₹${productPrice.toLocaleString()}\n\nOrder Now: ${link}\n\n${content.hashtags.join(' ')}`;
        } else if (activePlatform === 'facebook') {
            text = `${content.headline}\n\n${content.postBody}\n\nPrice: ₹${productPrice.toLocaleString()}\n\nSecure Order: ${link}`;
        } else if (activePlatform === 'pinterest') {
            text = `${content.title}\n\n${content.description}\n\nShop Here: ${link}\n\nKeywords: ${content.keywords.join(', ')}`;
        } else if (activePlatform === 'youtube') {
            text = `--- VIDEO SCRIPT ---\n${content.videoScript}\n\n--- DESCRIPTION ---\n${content.description}\n\nProduct: ${link}`;
        }

        navigator.clipboard.writeText(text);
        toast({ title: "Post Kit Copied!", description: "Text and tags are ready to be pasted." });
    };

    const currentPlatformData = adContent?.platforms[activePlatform];

    return (
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col p-0 border-none">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-xl">
                        <Wand2 className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl">AI Social Studio</DialogTitle>
                        <DialogDescription className="text-slate-400">Everything you need to launch this product on social media.</DialogDescription>
                    </div>
                </div>
                <div className="flex gap-2">
                     <Button onClick={handleGenerateAIAd} disabled={isGenerating || !isPriceValid} className="font-bold">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {adContent ? 'Regenerate Content' : 'AI Magic: Write Post Kit'}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-slate-100 border-b px-6 py-2">
                    <TabsList className="bg-transparent h-auto gap-4">
                        <TabsTrigger value="text" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2">
                            <LayoutTemplate className="mr-2 h-4 w-4" /> 1. Post Text & Tags
                        </TabsTrigger>
                        <TabsTrigger value="visual" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 py-2">
                            <LucideImage className="mr-2 h-4 w-4" /> 2. Visual Ad Tile
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="text" className="h-full m-0 p-0">
                        <div className="flex h-full">
                            <div className="w-64 border-r bg-slate-50 p-4 space-y-2 shrink-0">
                                <Label className="text-[10px] uppercase font-bold tracking-widest text-slate-500 px-2">Choose Platform</Label>
                                <Button 
                                    variant={activePlatform === 'instagram' ? 'default' : 'ghost'} 
                                    className="w-full justify-start rounded-xl" 
                                    onClick={() => setActivePlatform('instagram')}
                                >
                                    <Instagram className="mr-2 h-4 w-4" /> Instagram
                                </Button>
                                <Button 
                                    variant={activePlatform === 'facebook' ? 'default' : 'ghost'} 
                                    className="w-full justify-start rounded-xl" 
                                    onClick={() => setActivePlatform('facebook')}
                                >
                                    <Facebook className="mr-2 h-4 w-4" /> Facebook
                                </Button>
                                <Button 
                                    variant={activePlatform === 'pinterest' ? 'default' : 'ghost'} 
                                    className="w-full justify-start rounded-xl" 
                                    onClick={() => setActivePlatform('pinterest')}
                                >
                                    <Share2 className="mr-2 h-4 w-4" /> Pinterest
                                </Button>
                                <Button 
                                    variant={activePlatform === 'youtube' ? 'default' : 'ghost'} 
                                    className="w-full justify-start rounded-xl" 
                                    onClick={() => setActivePlatform('youtube')}
                                >
                                    <Youtube className="mr-2 h-4 w-4" /> YouTube
                                </Button>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto">
                                {!adContent ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                                        <Sparkles className="h-16 w-16 text-slate-300" />
                                        <div>
                                            <h3 className="text-xl font-bold">Your AI Posting Kit is Ready</h3>
                                            <p className="text-sm">Click "AI Magic" to generate stories, tags, and strategies.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-2xl font-black italic uppercase flex items-center gap-2">
                                                {activePlatform} Strategy
                                            </h2>
                                            <Button onClick={handleCopyAll} variant="secondary" className="rounded-full h-10 px-6">
                                                <Copy className="mr-2 h-4 w-4" /> Copy Full Kit
                                            </Button>
                                        </div>

                                        <div className="space-y-6">
                                            <section className="space-y-3">
                                                <Label className="text-sm font-bold flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> 
                                                    Primary Copy
                                                </Label>
                                                <div className="p-6 bg-white border-2 rounded-2xl text-lg leading-relaxed whitespace-pre-wrap shadow-sm">
                                                    {activePlatform === 'instagram' && currentPlatformData.caption}
                                                    {activePlatform === 'facebook' && currentPlatformData.postBody}
                                                    {activePlatform === 'pinterest' && currentPlatformData.description}
                                                    {activePlatform === 'youtube' && (
                                                        <div className="space-y-4">
                                                            <div className="p-4 bg-slate-900 text-white rounded-xl italic text-sm">
                                                                <p className="font-bold text-xs uppercase text-slate-400 mb-2">Video Script:</p>
                                                                "{currentPlatformData.videoScript}"
                                                            </div>
                                                            <p>{currentPlatformData.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>

                                            <section className="space-y-3">
                                                <Label className="text-sm font-bold flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-primary" /> 
                                                    Tags & Keywords
                                                </Label>
                                                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border rounded-2xl">
                                                    {(currentPlatformData.hashtags || currentPlatformData.keywords || currentPlatformData.tags || []).map((tag: string) => (
                                                        <Badge key={tag} variant="secondary" className="bg-white border text-primary px-3 py-1 font-medium">{tag}</Badge>
                                                    ))}
                                                </div>
                                            </section>

                                            <Alert className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl">
                                                <Info className="h-4 w-4" />
                                                <AlertTitle className="font-bold">Pro Tip for {activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)}</AlertTitle>
                                                <AlertDescription>{currentPlatformData.postingTip}</AlertDescription>
                                            </Alert>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="visual" className="h-full m-0 p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-3xl font-black italic uppercase">Visual Ad Studio</h3>
                                    <p className="text-slate-500 mt-2">Customize the high-impact visual that customers will see.</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Campaign Headline</Label>
                                        <Input 
                                            value={adHeadline} 
                                            onChange={e => setAdHeadline(e.target.value)} 
                                            placeholder="Enter a punchy headline"
                                            className="h-12 text-lg font-bold border-2 focus-visible:ring-primary rounded-xl"
                                        />
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed space-y-6">
                                        <div className="space-y-4">
                                            <Label className="font-bold flex items-center gap-2">
                                                <Factory className="h-4 w-4" /> Vendor Logo
                                            </Label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-20 border rounded-2xl flex items-center justify-center bg-white overflow-hidden relative shadow-sm">
                                                    {logoDataUri ? (
                                                        <Image src={logoDataUri} alt="logo" fill className="object-contain p-2" />
                                                    ) : (
                                                        <LucideImage className="h-8 w-8 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs h-10" />
                                                    <p className="text-[10px] text-muted-foreground">Upload your brand logo to replace the "Super Admin" text.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Show Brand Name Text</Label>
                                                <p className="text-xs text-muted-foreground">Toggle to hide "Super Admin" text.</p>
                                            </div>
                                            <Switch checked={showBrandText} onCheckedChange={setShowBrandText} />
                                        </div>
                                    </div>

                                    {!isPriceValid && (
                                        <Alert variant="destructive" className="rounded-2xl">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Price Required</AlertTitle>
                                            <AlertDescription>You must set a selling price for this product to generate an ad tile.</AlertDescription>
                                        </Alert>
                                    )}

                                    {finalAdImage && (
                                        <div className="pt-4">
                                            <a href={finalAdImage} download={`${product.title.replace(/\s+/g, '_')}_ad.jpg`} className="w-full">
                                                <Button size="lg" className="w-full h-16 text-xl font-black shadow-xl rounded-2xl hover:scale-[1.02] transition-transform">
                                                    <Download className="mr-3 h-6 w-6" /> Download Ad Tile
                                                </Button>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center items-start lg:sticky lg:top-0 pt-4">
                                <div className="scale-[0.85] sm:scale-100 origin-top">
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

            <footer className="bg-slate-50 border-t p-4 flex justify-end shrink-0">
                <DialogClose asChild>
                    <Button variant="outline" className="rounded-xl px-8">Close Studio</Button>
                </DialogClose>
            </footer>
        </DialogContent>
    );
}
