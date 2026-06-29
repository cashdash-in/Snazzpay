
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Rocket, Globe, Palette, ShoppingBag, MessageSquare, CheckCircle2, DollarSign, Wand2, ShieldCheck, Key } from 'lucide-react';
import { startSiteBuilder } from '@/ai/flows/site-builder-flow';
import { type SiteBuilderOutput } from '@/ai/schemas/site-builder';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export default function SiteBuilderPage() {
    const { toast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [generatedConfig, setGeneratedConfig] = useState<SiteBuilderOutput | null>(null);
    const [creationFee, setCreationFee] = useState('999');
    
    // Store owner details
    const [ownerInfo, setOwnerInfo] = useState({
        name: '',
        email: '',
        razorpayKeyId: '',
        razorpayKeySecret: ''
    });

    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

    useEffect(() => {
        // Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        // Fetch platform key
        fetch('/api/get-key')
            .then(res => res.json())
            .then(data => setRazorpayKeyId(data.keyId))
            .catch(console.error);
    }, []);

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
        if (!generatedConfig || !ownerInfo.name || !ownerInfo.email) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide the store owner name and email.' });
            return;
        }

        if (!razorpayKeyId) {
            toast({ variant: 'destructive', title: 'Payment Error', description: 'Razorpay is not configured for the platform.' });
            return;
        }

        setIsPublishing(true);

        const fee = parseFloat(creationFee);

        // 1. Create a payment order for the creation fee
        try {
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: fee, 
                    productName: `Website Setup Fee: ${generatedConfig.storeName}`,
                    name: ownerInfo.name,
                    email: ownerInfo.email,
                    contact: '9999999999', // Dummy contact for fee collection
                    isAuthorization: false 
                }),
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            // 2. Open Razorpay for the admin fee
            const options = {
                key: razorpayKeyId,
                amount: fee * 100,
                currency: "INR",
                name: "SnazzPay Solutions",
                description: "AI Website Builder Fee",
                order_id: result.order_id,
                handler: async (paymentResponse: any) => {
                    // 3. Save the "Site" to a collection
                    const siteId = uuidv4();
                    const siteData = {
                        ...generatedConfig,
                        id: siteId,
                        status: 'published',
                        createdAt: new Date().toISOString(),
                        ownerId: 'admin',
                        ownerName: ownerInfo.name,
                        ownerEmail: ownerInfo.email,
                        customRazorpayKeyId: ownerInfo.razorpayKeyId,
                        customRazorpayKeySecret: ownerInfo.razorpayKeySecret,
                        feeCharged: fee,
                        paymentId: paymentResponse.razorpay_payment_id
                    };

                    await saveDocument('ai_generated_sites', siteData, siteId);

                    // 4. Create the products in the catalog
                    for (const p of generatedConfig.suggestedProducts) {
                        const prodId = uuidv4();
                        await saveDocument('product_drops', {
                            id: prodId,
                            vendorId: `site_${siteId}`,
                            vendorName: generatedConfig.storeName,
                            title: p.title,
                            description: p.description,
                            costPrice: p.price * 0.7,
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
                        description: `Successfully created "${generatedConfig.storeName}". Share the URL: ${window.location.origin}/site/${siteId}`,
                    });
                    setGeneratedConfig(null);
                    setPrompt('');
                    setOwnerInfo({ name: '', email: '', razorpayKeyId: '', razorpayKeySecret: '' });
                    setIsPublishing(false);
                },
                prefill: {
                    name: ownerInfo.name,
                    email: ownerInfo.email,
                },
                theme: { color: "#5a31f4" },
                modal: { ondismiss: () => setIsPublishing(false) }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Process Failed", description: error.message });
            setIsPublishing(false);
        }
    };

    return (
        <AppShell title="AI Website Builder">
            <div className="max-w-5xl mx-auto space-y-8">
                <Card className="border-primary/20 shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                            <Sparkles className="text-primary h-8 w-8" />
                            Launch a New Brand Instantly
                        </CardTitle>
                        <CardDescription>
                            Enter your business concept. Our AI will handle the naming, branding, inventory, and even set up your AI assistant.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="prompt">Describe the business (e.g. niche, style, target audience)</Label>
                            <Textarea 
                                id="prompt"
                                placeholder="e.g., A luxury sustainable yoga wear brand called 'EcoZen' for environmentally conscious women in their 20s and 30s."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                className="bg-white text-lg"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="fee">Generation & Setup Fee (INR)</Label>
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
                                className="mt-8 px-10 h-12 text-lg font-bold"
                            >
                                {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                                Generate Site Concept
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {isGenerating && (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <h3 className="text-xl font-bold italic">Engineering your digital storefront...</h3>
                        <p className="text-muted-foreground">Generating AI personality, selecting brand colors, and sourcing initial catalog.</p>
                    </div>
                )}

                {generatedConfig && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-green-200 bg-green-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                                        <Globe className="h-5 w-5" />
                                        Brand Identity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Store Name</Label>
                                        <p className="font-bold text-xl">{generatedConfig.storeName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Slogan</Label>
                                        <p className="italic text-sm">"{generatedConfig.slogan}"</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Primary Vibe</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl border shadow-sm" style={{ backgroundColor: generatedConfig.themeColor }}></div>
                                            <span className="font-mono text-sm">{generatedConfig.themeColor}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-blue-200 bg-blue-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-blue-700">
                                        <MessageSquare className="h-5 w-5" />
                                        AI Sales Assistant
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">AI Greeting</Label>
                                    <p className="text-sm mt-1 border-l-4 border-blue-200 pl-3 italic">"{generatedConfig.welcomeMessage}"</p>
                                </CardContent>
                            </Card>

                             <Card className="border-purple-200 bg-purple-50/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                                        <ShieldCheck className="h-5 w-5" />
                                        Customer Payment Gateway
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Store Owner Name</Label>
                                        <Input value={ownerInfo.name} onChange={e => setOwnerInfo({...ownerInfo, name: e.target.value})} placeholder="Full name" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase">Store Owner Email</Label>
                                        <Input value={ownerInfo.email} onChange={e => setOwnerInfo({...ownerInfo, email: e.target.value})} placeholder="Email for notifications" className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1 pt-2 border-t border-purple-100">
                                        <Label className="text-[10px] font-bold uppercase flex items-center gap-1"><Key className="h-3 w-3"/> Custom Razorpay Key ID</Label>
                                        <Input value={ownerInfo.razorpayKeyId} onChange={e => setOwnerInfo({...ownerInfo, razorpayKeyId: e.target.value})} placeholder="rzp_live_..." className="h-8 text-xs font-mono" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5 text-primary" />
                                        AI Curated Inventory
                                    </CardTitle>
                                    <CardDescription>These products will be pre-loaded into the store database.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {generatedConfig.suggestedProducts.map((p, idx) => (
                                            <div key={idx} className="p-4 border rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors">
                                                <div className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden bg-white">
                                                    <Image src={`https://picsum.photos/seed/${p.title}/400/400`} alt={p.title} fill className="object-cover" />
                                                </div>
                                                <p className="font-bold text-sm">{p.title}</p>
                                                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                                                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                                    <Badge variant="secondary" className="text-[9px] uppercase font-bold">{p.category}</Badge>
                                                    <span className="font-black text-sm text-primary">₹{p.price}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t pt-6 bg-slate-50/50 rounded-b-lg">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold">Ready to Launch?</p>
                                            <p className="text-xs text-muted-foreground">Setup fee: <span className="font-black text-primary">₹{creationFee}</span></p>
                                        </div>
                                        <Button 
                                            onClick={handlePublish} 
                                            disabled={isPublishing || !ownerInfo.name || !ownerInfo.email} 
                                            size="lg"
                                            className="px-10 h-14 text-lg"
                                        >
                                            {isPublishing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Rocket className="mr-2 h-6 w-6" />}
                                            Go Live Now
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

    