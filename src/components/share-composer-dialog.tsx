
'use client';

import { useState, useEffect, useMemo } from 'react';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { 
    Loader2, Wand2, AlertTriangle, Facebook, Instagram, 
    MessageSquare, Download, Share2, Youtube, MapPin, 
    ImageIcon, LayoutTemplate, Copy, Globe, QrCode
} from 'lucide-react';
import { createSocialAd } from '@/ai/flows/create-social-ad';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { getCookie } from 'cookies-next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SocialAdCard } from './social-ad-card';

// Can be a ProductDrop or a SellerProduct
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
};

interface ShareComposerDialogProps {
    product: ShareableProduct;
}

export function ShareComposerDialog({ product }: ShareComposerDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedImages, setSelectedImages] = useState<string[]>(product.imageDataUris);
    const [appUrl, setAppUrl] = useState('');
    const [adContent, setAdContent] = useState<any>(null);
    const [shareText, setShareText] = useState('');
    const [activeTab, setActiveTab] = useState('text');
    const [adHeadline, setAdHeadline] = useState('A Story of Style');
    const [finalAdImage, setFinalAdImage] = useState<string | null>(null);

    const productPrice = useMemo(() => product.price || product.costPrice || 0, [product]);
    const isPriceValid = productPrice > 0;

    const getCatalogueLink = () => {
        const currentUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
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

        const catalogueLink = getCatalogueLink();
        setShareText(`Check out this new product!\n\n*${product.title}*\n\nPrice: ₹${productPrice.toLocaleString()}\n\nOrder here: ${catalogueLink}`);
    }, [product, user, productPrice]);

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
            
            // Set initial share text to Instagram
            const link = getCatalogueLink();
            setShareText(`${result.platforms.instagram.caption}\n\nPrice: ₹${productPrice.toLocaleString()}\n\nOrder Now: ${link}\n\n${result.platforms.instagram.hashtags.join(' ')}`);
            
            toast({
                title: "AI Ad Generated!",
                description: "Copy for all platforms is ready in the tabs below.",
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Generation Failed", description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePlatformSwitch = (platform: string) => {
        if (!adContent) return;
        const link = getCatalogueLink();
        let text = '';
        
        switch(platform) {
            case 'instagram':
                text = `${adContent.platforms.instagram.caption}\n\nPrice: ₹${productPrice.toLocaleString()}\n\nOrder: ${link}\n\n${adContent.platforms.instagram.hashtags.join(' ')}`;
                break;
            case 'facebook':
                text = `*${adContent.platforms.facebook.headline}*\n\n${adContent.platforms.facebook.postBody}\n\nPrice: ₹${productPrice.toLocaleString()}\n\nSecure Order: ${link}`;
                break;
            case 'pinterest':
                text = `${adContent.platforms.pinterest.title}\n\n${adContent.platforms.pinterest.description}\n\nOrder via: ${link}`;
                break;
            case 'youtube':
                text = `--- VIDEO SCRIPT ---\n${adContent.platforms.youtube.videoScript}\n\n--- DESCRIPTION ---\n${adContent.platforms.youtube.description}\n\nProduct Link: ${link}`;
                break;
        }
        setShareText(text);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareText);
        toast({ title: "Ad Copy Copied!" });
    };

    return (
        <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center gap-2">
                    <Wand2 className="h-6 w-6 text-primary" />
                    <DialogTitle className="text-2xl">AI Social Ad Hub</DialogTitle>
                </div>
                <DialogDescription>Generate storytelling ads with unique visuals and QR codes for all social platforms.</DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text"><LayoutTemplate className="mr-2 h-4 w-4" /> 1. Ad Copy & Script</TabsTrigger>
                    <TabsTrigger value="visual"><ImageIcon className="mr-2 h-4 w-4" /> 2. Visual Ad Studio</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-6 pt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold">Generate Storytelling Content</h3>
                        <Button onClick={handleGenerateAIAd} disabled={isGenerating || !isPriceValid}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            AI Magic: Write Ad
                        </Button>
                    </div>

                    {!adContent ? (
                        <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground bg-muted/20">
                            Click "AI Magic" to generate platform-specific stories for this product.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-2">
                                <Label>Select Platform</Label>
                                <div className="grid gap-2">
                                    <Button variant="outline" className="justify-start" onClick={() => handlePlatformSwitch('instagram')}><Instagram className="mr-2 h-4 w-4" /> Instagram</Button>
                                    <Button variant="outline" className="justify-start" onClick={() => handlePlatformSwitch('facebook')}><Facebook className="mr-2 h-4 w-4" /> Facebook</Button>
                                    <Button variant="outline" className="justify-start" onClick={() => handlePlatformSwitch('pinterest')}><Share2 className="mr-2 h-4 w-4" /> Pinterest</Button>
                                    <Button variant="outline" className="justify-start" onClick={() => handlePlatformSwitch('youtube')}><Youtube className="mr-2 h-4 w-4" /> YouTube</Button>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-4">
                                <div className="flex justify-between items-center">
                                    <Label>Generated Ad Text</Label>
                                    <Button size="sm" variant="ghost" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
                                </div>
                                <Textarea 
                                    value={shareText} 
                                    onChange={e => setShareText(e.target.value)} 
                                    className="min-h-[300px] text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="visual" className="pt-4 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold mb-2">Ad Customization</h3>
                                <p className="text-sm text-muted-foreground">This visual will automatically include your product image, a "Buy Now" CTA, and a secure QR code.</p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Story Headline (Appears on Image)</Label>
                                <Input 
                                    value={adHeadline} 
                                    onChange={e => setAdHeadline(e.target.value)} 
                                    placeholder="e.g. Elevate Your Daily Style"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>QR Code Action</Label>
                                <div className="p-4 bg-muted/50 rounded-lg text-xs space-y-1">
                                    <div className="flex items-center gap-2"><QrCode className="h-3 w-3" /> <span>Direct Order Link: Enabled</span></div>
                                    <div className="flex items-center gap-2 text-primary font-bold"><MessageSquare className="h-3 w-3" /> <span>WhatsApp Support: Auto-Linked</span></div>
                                </div>
                            </div>

                            {!isPriceValid && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Price Required</AlertTitle>
                                    <AlertDescription>You must set a price before generating an ad.</AlertDescription>
                                </Alert>
                            )}

                            {finalAdImage && (
                                <div className="flex flex-col gap-2">
                                    <a href={finalAdImage} download={`${product.title.replace(/\s+/g, '_')}_ad.jpg`} className="w-full">
                                        <Button className="w-full h-12 text-lg font-black shadow-lg">
                                            <Download className="mr-2" /> Download Final Ad Tile
                                        </Button>
                                    </a>
                                    <p className="text-[10px] text-center text-muted-foreground">High-resolution JPEG suitable for all platforms.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center">
                            <SocialAdCard 
                                imageUrl={product.imageDataUris[0]}
                                title={product.title}
                                headline={adHeadline}
                                price={productPrice}
                                qrUrl={getCatalogueLink()}
                                brandName={user?.displayName || product.vendorName}
                                onCanvasUpdate={setFinalAdImage}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <DialogFooter className="border-t pt-4">
                <DialogClose asChild>
                    <Button variant="ghost">Close Studio</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}
