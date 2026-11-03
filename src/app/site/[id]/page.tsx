
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument, getCollection, saveDocument } from '@/services/firestore';
import { type SiteBuilderOutput } from '@/ai/schemas/site-builder';
import { type ProductDrop } from '@/app/vendor/product-drops/page';
import { 
    Loader2, ShoppingCart, Star, ShieldCheck, 
    Zap, Menu, X, Trash2, Clock, 
    AlertTriangle, CreditCard, CheckCircle2,
    Sparkles, ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SiteChatbot } from '@/components/site/site-chatbot';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription,
    SheetFooter,
    SheetTrigger
} from '@/components/ui/sheet';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogClose 
} from '@/components/ui/dialog';
import { differenceInDays, parseISO, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PublicSitePage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [site, setSite] = useState<any | null>(null);
    const [products, setProducts] = useState<ProductDrop[]>([]);
    const [cart, setCart] = useState<{ product: ProductDrop; quantity: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
    const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);
    const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

    const siteId = params.id as string;

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        fetch('/api/get-key')
            .then(res => res.json())
            .then(data => setRazorpayKeyId(data.keyId))
            .catch(console.error);

        async function loadSite() {
            try {
                const siteData = await getDocument<any>('ai_generated_sites', siteId);
                if (!siteData) {
                    setIsLoading(false);
                    return;
                }
                setSite(siteData);

                const allProducts = await getCollection<ProductDrop>('product_drops');
                const siteProducts = allProducts.filter(p => p.vendorId === `site_${siteId}`);
                setProducts(siteProducts);

            } catch (error) {
                console.error("Failed to load site:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadSite();
    }, [siteId]);

    const daysRemaining = useMemo(() => {
        if (!site?.isTrial || !site?.trialExpiresAt) return null;
        const diff = differenceInDays(parseISO(site.trialExpiresAt), new Date());
        return diff < 0 ? 0 : diff;
    }, [site]);

    const handleUpgrade = async (plan: { name: string; amount: number; duration: number }) => {
        if (!razorpayKeyId || !site) {
            toast({ variant: 'destructive', title: "Gateway Error", description: "Payment system is not ready." });
            return;
        }

        setIsProcessingUpgrade(true);
        try {
            const response = await fetch('/api/create-mandate-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    amount: plan.amount, 
                    productName: `Subscription Upgrade: ${site.storeName}`,
                    name: site.ownerName,
                    email: site.ownerEmail,
                    contact: '9999999999',
                    isAuthorization: false 
                }),
            });
            const result = await response.json();

            const options = {
                key: razorpayKeyId,
                amount: plan.amount * 100,
                currency: "INR",
                name: "SnazzPay",
                description: `Unlock Lifetime Access for ${site.storeName}`,
                order_id: result.order_id,
                handler: async (paymentResponse: any) => {
                    const expiryDate = addDays(new Date(), plan.duration).toISOString();
                    const updates = {
                        isTrial: false,
                        trialExpiresAt: null,
                        licenseExpiry: expiryDate,
                        status: 'published',
                        lastPaymentId: paymentResponse.razorpay_payment_id
                    };
                    await saveDocument('ai_generated_sites', updates, siteId);
                    setSite({ ...site, ...updates });
                    setIsUpgradeOpen(false);
                    toast({ title: "Subscription Active!", description: "Your store is now fully licensed." });
                },
                theme: { color: "#5a31f4" },
                modal: { ondismiss: () => setIsProcessingUpgrade(false) }
            };
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Payment Failed' });
        } finally {
            setIsProcessingUpgrade(false);
        }
    };

    const addToCart = (product: ProductDrop) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
        toast({ title: 'Added to cart!', description: `${product.title} has been added.` });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
    }, [cart]);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        const item = cart[0].product;
        const checkoutUrl = new URL(`${window.location.origin}/catalogue`);
        checkoutUrl.searchParams.set('id', item.id);
        checkoutUrl.searchParams.set('sellerId', `site_${siteId}`);
        checkoutUrl.searchParams.set('sellerName', site?.storeName || '');
        checkoutUrl.searchParams.set('return_url', window.location.href);
        router.push(checkoutUrl.toString());
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Loading store...</p>
            </div>
        );
    }

    if (!site) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <h1 className="text-4xl font-bold">404</h1>
                <p className="text-xl text-muted-foreground mt-2">Store Not Found</p>
                <Button className="mt-6" onClick={() => router.push('/')}>Return Home</Button>
            </div>
        );
    }

    const themeColor = site.themeColor || '#5a31f4';
    const accentColor = site.accentColor || '#7c3aed';

    return (
        <div className="min-h-screen bg-white" style={{ '--primary': themeColor } as React.CSSProperties}>
            {/* Trial Banner */}
            {site.isTrial && (
                <div className="bg-slate-900 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>TRIAL MODE: {daysRemaining} days left.</span>
                    </div>
                    <Button 
                        variant="secondary" 
                        size="sm"
                        className="h-7 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white border-none font-black uppercase text-[9px] tracking-widest shadow-lg"
                        onClick={() => setIsUpgradeOpen(true)}
                    >
                        Unlock Full Store (₹999)
                    </Button>
                </div>
            )}

            {/* Navigation */}
            <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: themeColor }}>
                            <Store className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-black italic tracking-tighter uppercase">{site.storeName}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-xs font-black uppercase tracking-widest text-slate-400">
                        <a href="#home" className="hover:text-primary transition-colors text-slate-900">Home</a>
                        <a href="#shop" className="hover:text-primary transition-colors">Shop</a>
                        <a href="#about" className="hover:text-primary transition-colors">Story</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative h-12 w-12 rounded-full hover:bg-slate-100">
                                    <ShoppingCart className="h-6 w-6 text-slate-700" />
                                    {cart.length > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: accentColor }}>
                                            {cart.length}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="rounded-l-[32px] p-8">
                                <SheetHeader>
                                    <SheetTitle className="text-2xl font-black italic uppercase">My Cart</SheetTitle>
                                    <SheetDescription>Secure checkout is one step away.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-8 space-y-4 flex-1 overflow-y-auto pr-2">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-20 opacity-20">
                                            <ShoppingCart className="h-16 w-16 mx-auto mb-4" />
                                            <p className="font-black uppercase italic text-xs">Your bag is empty</p>
                                        </div>
                                    ) : (
                                        cart.map((item) => (
                                            <div key={item.product.id} className="flex gap-4 p-3 border-2 border-slate-50 rounded-2xl bg-white shadow-sm hover:border-slate-100 transition-colors">
                                                <div className="relative h-20 w-20 rounded-xl overflow-hidden shrink-0 border">
                                                    <Image src={item.product.imageDataUris[0]} alt={item.product.title} fill className="object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <p className="font-black text-sm uppercase truncate italic">{item.product.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">QTY: {item.quantity}</p>
                                                    <p className="font-black text-lg mt-2" style={{ color: themeColor }}>₹{item.product.price}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {cart.length > 0 && (
                                    <SheetFooter className="mt-8 border-t pt-8 flex flex-col gap-4">
                                        <div className="flex justify-between items-center w-full mb-4">
                                            <span className="font-black uppercase text-slate-400 text-xs tracking-widest">Total Value</span>
                                            <span className="text-3xl font-black italic" style={{ color: themeColor }}>₹{cartTotal}</span>
                                        </div>
                                        <Button className="w-full h-16 text-lg font-black uppercase italic rounded-2xl shadow-xl hover:scale-[1.02] transition-all" style={{ backgroundColor: themeColor }} onClick={handleCheckout}>
                                            Proceed to Payment <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-300 tracking-widest mt-4">
                                            <ShieldCheck className="h-4 w-4" /> Secured by SnazzPay Trust Wallet
                                        </div>
                                    </SheetFooter>
                                )}
                            </SheetContent>
                        </Sheet>
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            {isMenuOpen ? <X /> : <Menu />}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative pt-20 pb-32 overflow-hidden bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <Badge variant="secondary" className="px-5 py-1.5 text-xs font-black tracking-widest uppercase italic shadow-sm" style={{ color: themeColor, backgroundColor: `white` }}>
                            ✨ {site.slogan}
                        </Badge>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 leading-[0.9] uppercase italic">
                            Elevate your <br/> <span style={{ color: themeColor }}>{site.storeName}</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium">
                            Experience next-generation AI shopping. Personalized, secure, and crafted for excellence.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            <Button size="lg" className="h-16 px-10 text-lg font-black uppercase italic shadow-2xl hover:scale-105 transition-transform text-white rounded-2xl" style={{ backgroundColor: themeColor }}>
                                Explore Products
                            </Button>
                            <Button size="lg" variant="outline" className="h-16 px-10 text-lg font-black uppercase italic border-2 rounded-2xl bg-white">
                                View Lookbook
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] blur-[120px] opacity-10 pointer-events-none rounded-full" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute top-1/3 right-0 -translate-y-1/2 w-[500px] h-[500px] blur-[120px] opacity-10 pointer-events-none rounded-full" style={{ backgroundColor: accentColor }}></div>
            </section>

            {/* Products Section */}
            <section id="shop" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Curated Catalog</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                                <Sparkles className="h-3 w-3 text-primary" /> AI Recommended Arrivals
                            </p>
                        </div>
                        <Button variant="ghost" className="font-black uppercase tracking-widest text-[11px] h-10 px-6 rounded-full border" style={{ color: themeColor }}>View Full Collection</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                        {products.map((p) => (
                            <Card key={p.id} className="group border-none shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white rounded-[32px] flex flex-col h-full border border-slate-50">
                                <div className="relative aspect-square overflow-hidden bg-slate-50">
                                    <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <Button className="h-12 px-8 font-black uppercase italic rounded-full shadow-2xl scale-90 group-hover:scale-100 transition-transform text-white" onClick={() => addToCart(p)} style={{ backgroundColor: themeColor }}>
                                            Add to Bag
                                        </Button>
                                    </div>
                                    <Badge className="absolute top-4 left-4 bg-white/95 text-slate-900 border-none font-black italic text-[9px] px-3 py-1 rounded-full shadow-sm">NEW SEASON</Badge>
                                </div>
                                <CardContent className="p-6 flex-1 space-y-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <h3 className="font-black italic uppercase text-sm text-slate-800 line-clamp-1 leading-tight">{p.title}</h3>
                                        <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="text-[10px] font-black">4.9</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-relaxed uppercase tracking-wider">{p.description}</p>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-50 mt-auto">
                                        <span className="text-xl font-black text-slate-900">₹{p.price}</span>
                                        <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 rounded-md">{p.category}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* AI Upgrade Dialog */}
            <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
                <DialogContent className="rounded-[40px] max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="bg-slate-900 p-10 md:p-12 text-white space-y-8 flex flex-col justify-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4">
                                <Zap className="h-8 w-8 text-white fill-current" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-[0.9]">Unlock Full <br/> Store Capacity</h2>
                                <p className="text-slate-400 text-sm font-medium">Your 15-day trial is active. Upgrade to Lifetime access to secure your brand forever.</p>
                            </div>
                            <ul className="space-y-4 pt-4">
                                {['Lifetime Store Hosting', 'Infinite AI Product Snapshots', 'Advanced P&L Analytics', 'Custom Domain Support'].map(f => (
                                    <li key={f} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-300">
                                        <CheckCircle2 className="h-4 w-4 text-blue-500" /> {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-10 md:p-12 bg-white flex flex-col justify-center gap-8">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black italic uppercase tracking-widest text-slate-400">Select License Plan</DialogTitle>
                            </DialogHeader>
                            <Card className="rounded-[32px] border-2 border-primary bg-primary/5 p-8 relative overflow-hidden group hover:scale-[1.02] transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Zap className="h-20 w-20" /></div>
                                <h3 className="font-black italic uppercase text-lg mb-2">Lifetime Access</h3>
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-5xl font-black italic tracking-tighter">₹999</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">one time</span>
                                </div>
                                <Button 
                                    className="w-full h-14 rounded-2xl bg-primary text-lg font-black uppercase italic shadow-xl shadow-primary/20"
                                    onClick={() => handleUpgrade({ name: 'Lifetime Access', amount: 999, duration: 9999 })}
                                    disabled={isProcessingUpgrade}
                                >
                                    {isProcessingUpgrade ? <Loader2 className="animate-spin" /> : "Pay & Activate Now"}
                                </Button>
                            </Card>
                            <p className="text-[10px] text-center font-black uppercase tracking-widest text-slate-400">
                                <ShieldCheck className="h-3 w-3 inline mr-1" /> Payments secured by Razorpay
                            </p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI Chatbot */}
            <SiteChatbot 
                siteId={siteId} 
                welcomeMessage={site.welcomeMessage} 
                themeColor={themeColor} 
                persona={site.aiPersona}
                storeName={site.storeName}
            />

            {/* Footer */}
            <footer className="py-20 border-t bg-slate-900 text-white overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
                    <div className="text-center md:text-left space-y-2">
                        <p className="text-3xl font-black italic tracking-tighter uppercase leading-none">{site.storeName}</p>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">{site.slogan}</p>
                    </div>
                    <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Support</a>
                    </div>
                    <div className="text-slate-600 text-[9px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                        <ShieldCheck className="h-4 w-4 text-blue-500" /> Powered by SnazzPay AI
                    </div>
                </div>
            </footer>
        </div>
    );
}
