'use client';

import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Sparkles, Rocket, Globe, MessageSquare, 
    DollarSign, Wand2, ShieldCheck, Send, Bot, 
    User, ShoppingBag, Clock, LayoutTemplate, ImageIcon,
    PlusCircle
} from 'lucide-react';
import { startSiteBuilder } from '@/ai/flows/site-builder-flow';
import { type SiteBuilderOutput } from '@/ai/schemas/site-builder';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function SiteBuilderPage() {
    const { toast } = useToast();
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [generatedConfig, setGeneratedConfig] = useState<SiteBuilderOutput | null>(null);
    const [isTrial, setIsTrial] = useState(true);
    const [creationFee] = useState('999');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    const [ownerInfo, setOwnerInfo] = useState({
        name: '',
        email: '',
        razorpayKeyId: '',
        razorpayKeySecret: ''
    });

    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        fetch('/api/get-key')
            .then(res => res.json())
            .then(data => setRazorpayKeyId(data.keyId))
            .catch(console.error);
            
        setChatHistory([{ role: 'assistant', content: "Hi! I'm your AI Store Architect. Describe the kind of online business you want to start, and I'll build it for you." }]);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isGenerating]);

    const handleAIChat = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!prompt || isGenerating) return;

        const userMsg = prompt;
        setPrompt('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsGenerating(true);

        try {
            const config = await startSiteBuilder({ 
                prompt: userMsg, 
                currentConfig: generatedConfig || undefined 
            });
            setGeneratedConfig(config);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: `I've updated the design for "${config.storeName}". Check the preview to see the new look and products!` 
            }]);
        } catch (error: any) {
            console.error("Architect Error:", error);
            toast({ variant: 'destructive', title: "Architect Error", description: error.message });
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!generatedConfig || !ownerInfo.name || !ownerInfo.email) {
            toast({ variant: 'destructive', title: 'Missing Info', description: 'Please provide store owner details.' });
            return;
        }

        setIsPublishing(true);
        const siteId = uuidv4();
        const trialExpiry = addDays(new Date(), 15).toISOString();

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
            isTrial,
            trialExpiresAt: isTrial ? trialExpiry : null,
            feeCharged: isTrial ? 0 : parseFloat(creationFee),
        };

        if (isTrial) {
            await finalizeDeployment(siteId, siteData);
        } else {
            if (!razorpayKeyId) {
                toast({ variant: 'destructive', title: 'Payment Error', description: 'Gateway not ready.' });
                setIsPublishing(false);
                return;
            }

            try {
                const response = await fetch('/api/create-mandate-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        amount: parseFloat(creationFee), 
                        productName: `Setup Fee: ${generatedConfig.storeName}`,
                        name: ownerInfo.name,
                        email: ownerInfo.email,
                        contact: '9999999999',
                        isAuthorization: false 
                    }),
                });
                const result = await response.json();

                const options = {
                    key: razorpayKeyId,
                    amount: parseFloat(creationFee) * 100,
                    currency: "INR",
                    name: "SnazzPay",
                    description: "Site Activation Fee",
                    order_id: result.order_id,
                    handler: async (paymentResponse: any) => {
                        await finalizeDeployment(siteId, { ...siteData, paymentId: paymentResponse.razorpay_payment_id });
                    },
                    theme: { color: "#5a31f4" },
                    modal: { ondismiss: () => setIsPublishing(false) }
                };
                const rzp = new (window as any).Razorpay(options);
                rzp.open();
            } catch (err) {
                toast({ variant: 'destructive', title: 'Payment Failed' });
                setIsPublishing(false);
            }
        }
    };

    const finalizeDeployment = async (siteId: string, siteData: any) => {
        try {
            await saveDocument('ai_generated_sites', siteData, siteId);

            for (const p of generatedConfig!.suggestedProducts) {
                const prodId = uuidv4();
                await saveDocument('product_drops', {
                    id: prodId,
                    vendorId: `site_${siteId}`,
                    vendorName: generatedConfig!.storeName,
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
                description: `URL: ${window.location.origin}/site/${siteId}`,
            });
            setGeneratedConfig(null);
            setChatHistory([{ role: 'assistant', content: "Success! Your store is live. What else can I help you build?" }]);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Deployment Error' });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <AppShell title="AI Store Architect">
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)]">
                {/* AI Chat Sidebar */}
                <Card className="w-full lg:w-1/3 flex flex-col border-primary/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-4">
                        <div className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-purple-400" />
                            <div>
                                <CardTitle className="text-base">Store Architect</CardTitle>
                                <CardDescription className="text-slate-400 text-xs">I build professional stores from chat.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", 
                                    msg.role === 'assistant' ? "bg-white" : "bg-primary text-white")}>
                                    {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </div>
                                <div className={cn("p-3 rounded-2xl text-sm shadow-sm max-w-[80%]", 
                                    msg.role === 'assistant' ? "bg-white border rounded-tl-none" : "bg-primary text-white rounded-tr-none")}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isGenerating && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                                <div className="p-3 bg-white border rounded-2xl rounded-tl-none italic text-xs text-muted-foreground animate-pulse">
                                    Architect is drafting your site...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-white">
                        <form onSubmit={handleAIChat} className="flex w-full gap-2">
                            <Input 
                                placeholder="Describe your brand..." 
                                value={prompt} 
                                onChange={(e) => setPrompt(e.target.value)}
                                className="bg-slate-50 border-none"
                            />
                            <Button type="submit" size="icon" disabled={isGenerating || !prompt}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>

                {/* Preview & Launch Area */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
                    {!generatedConfig ? (
                        <div className="flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-white">
                            <div className="p-6 bg-purple-50 rounded-full mb-6">
                                <LayoutTemplate className="h-16 w-16 text-primary opacity-20" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800">Your Store Preview</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">Use the AI Architect chat to start building your brand identity and product catalog.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-green-100 bg-green-50/10 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                                            <Globe className="h-4 w-4" /> Brand Identity
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Store Name</p>
                                            <p className="font-bold text-lg">{generatedConfig.storeName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Slogan</p>
                                            <p className="italic text-xs text-muted-foreground">"{generatedConfig.slogan}"</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Theme</p>
                                                <div className="w-12 h-6 rounded border" style={{ backgroundColor: generatedConfig.themeColor }}></div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Accent</p>
                                                <div className="w-12 h-6 rounded border" style={{ backgroundColor: generatedConfig.accentColor }}></div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-indigo-100 bg-indigo-50/10 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
                                            <ShieldCheck className="h-4 w-4" /> Owner & Launch
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Input 
                                            placeholder="Owner Full Name" 
                                            value={ownerInfo.name}
                                            onChange={e => setOwnerInfo({...ownerInfo, name: e.target.value})}
                                            className="h-8 text-xs bg-white"
                                        />
                                        <Input 
                                            placeholder="Contact Email" 
                                            value={ownerInfo.email}
                                            onChange={e => setOwnerInfo({...ownerInfo, email: e.target.value})}
                                            className="h-8 text-xs bg-white"
                                        />
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-[10px] font-bold">Launch Plan</Label>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        size="sm" 
                                                        variant={isTrial ? 'default' : 'outline'} 
                                                        onClick={() => setIsTrial(true)}
                                                        className="flex-1 h-8 text-[10px]"
                                                    >
                                                        15-Day Trial (FREE)
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant={!isTrial ? 'default' : 'outline'} 
                                                        onClick={() => setIsTrial(false)}
                                                        className="flex-1 h-8 text-[10px]"
                                                    >
                                                        Lifetime (₹{creationFee})
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="shadow-lg border-primary/10 overflow-hidden">
                                <CardHeader className="bg-slate-50 flex flex-row justify-between items-center py-4">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5 text-primary" /> Initial Inventory
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-white">{generatedConfig.suggestedProducts.length} Items</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-2 md:grid-cols-4 border-t">
                                        {generatedConfig.suggestedProducts.map((p, idx) => (
                                            <div key={idx} className="p-4 border-r border-b group hover:bg-slate-50 transition-colors">
                                                <div className="relative aspect-square rounded-xl bg-slate-100 mb-3 overflow-hidden">
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ImageIcon className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                </div>
                                                <p className="font-bold text-xs truncate">{p.title}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] font-black text-primary">₹{p.price}</span>
                                                    <Badge className="text-[8px] h-4">{p.category}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50 p-6 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {isTrial && (
                                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                                                <Clock className="h-4 w-4" />
                                                <span className="text-xs font-bold">15 Days Free Trial</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        size="lg" 
                                        onClick={handlePublish} 
                                        disabled={isPublishing || !ownerInfo.name || !ownerInfo.email}
                                        className="px-12 h-14 text-lg font-black shadow-xl hover:scale-105 transition-transform"
                                    >
                                        {isPublishing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Rocket className="mr-2 h-6 w-6" />}
                                        {isTrial ? 'Start Trial Now' : 'Pay & Go Live'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
