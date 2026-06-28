'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Rocket, Globe, Palette, ShoppingBag, MessageSquare, CheckCircle2, DollarSign } from 'lucide-react';
import { startSiteBuilder } from '@/ai/flows/site-builder-flow';
import { type SiteBuilderOutput } from '@/ai/schemas/site-builder';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

export default function SiteBuilderPage() {
    const { toast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [generatedConfig, setGeneratedConfig] = useState<SiteBuilderOutput | null>(null);
    const [creationFee, setCreationFee] = useState('999');

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setGeneratedConfig(null);

        try {
            const config = await startSiteBuilder({ prompt });
            setGeneratedConfig(config);
            toast({
                title: "Draft Created!",
                description: "AI has designed your store. Review the details below.",
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: error.message,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!generatedConfig) return;
        setIsPublishing(true);

        try {
            // 1. In a real scenario, we would trigger a Razorpay payment here for the 'creationFee'
            // For this MVP, we proceed to save the "Site" to a collection
            
            const siteId = uuidv4();
            const siteData = {
                ...generatedConfig,
                id: siteId,
                status: 'published',
                createdAt: new Date().toISOString(),
                ownerId: 'admin',
                feeCharged: parseFloat(creationFee),
            };

            await saveDocument('ai_generated_sites', siteData, siteId);

            // 2. Create the products in the catalog
            for (const p of generatedConfig.suggestedProducts) {
                const prodId = uuidv4();
                await saveDocument('product_drops', {
                    id: prodId,
                    vendorId: 'admin_site_builder',
                    vendorName: generatedConfig.storeName,
                    title: p.title,
                    description: p.description,
                    costPrice: p.price * 0.7, // Assume 30% margin
                    price: p.price,
                    category: p.category,
                    imageDataUris: [`https://picsum.photos/seed/${prodId}/400/400`],
                    createdAt: new Date().toISOString(),
                    sizes: ['Standard'],
                    colors: ['Default'],
                    allowedPaymentMethods: ['Secure COD', 'Prepaid'],
                }, prodId);
            }

            toast({
                title: "Website Published!",
                description: `Successfully created "${generatedConfig.storeName}". Your customer can now log in.`,
            });
            setGeneratedConfig(null);
            setPrompt('');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Publishing Failed",
                description: error.message,
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <AppShell title="AI Website Builder">
            <div className="max-w-5xl mx-auto space-y-8">
                <Card className="border-primary/20 shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="text-primary h-6 w-6" />
                            One-Prompt Store Creator
                        </CardTitle>
                        <CardDescription>
                            Describe the business idea, and our AI will build a complete e-commerce experience including branding, products, and a chatbot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prompt">What kind of store do you want to build?</Label>
                            <Textarea 
                                id="prompt"
                                placeholder="e.g., A luxury watch brand for young professionals called 'Chronos', focusing on minimalist designs and sustainability."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                className="bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="fee">Generation Fee (INR)</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="fee" 
                                        type="number" 
                                        value={creationFee} 
                                        onChange={(e) => setCreationFee(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={handleGenerate} 
                                disabled={isGenerating || !prompt}
                                size="lg"
                                className="mt-8"
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                Generate Site Draft
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {isGenerating && (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <h3 className="text-xl font-bold italic">Building the infrastructure...</h3>
                        <p className="text-muted-foreground">AI is designing the layout and sourcing initial inventory.</p>
                    </div>
                )}

                {generatedConfig && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-green-200 bg-green-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-green-600" />
                                        Brand Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Store Name</Label>
                                        <p className="font-bold text-xl">{generatedConfig.storeName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Slogan</Label>
                                        <p className="italic">"{generatedConfig.slogan}"</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Primary Theme</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: generatedConfig.themeColor }}></div>
                                            <span className="font-mono text-xs">{generatedConfig.themeColor}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-200 bg-blue-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-blue-600" />
                                        AI Chatbot
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Label className="text-xs uppercase text-muted-foreground">Greeting Message</Label>
                                    <p className="text-sm mt-1">"{generatedConfig.welcomeMessage}"</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5 text-primary" />
                                        Initial Inventory
                                    </CardTitle>
                                    <CardDescription>These products will be automatically added to the new store.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {generatedConfig.suggestedProducts.map((p, idx) => (
                                            <div key={idx} className="p-3 border rounded-xl bg-muted/20">
                                                <p className="font-bold text-sm">{p.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                                                    <span className="font-black text-sm text-primary">₹{p.price}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-6 bg-slate-50/50">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">Ready to deploy?</p>
                                            <p className="text-xs text-muted-foreground">This will create the store and charge ₹{creationFee}.</p>
                                        </div>
                                        <Button onClick={handlePublish} disabled={isPublishing} size="lg">
                                            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                                            Publish Website
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
