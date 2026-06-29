
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDocument, getCollection } from '@/services/firestore';
import { type SiteBuilderOutput } from '@/ai/schemas/site-builder';
import { type ProductDrop } from '@/app/vendor/product-drops/page';
import { Loader2, ShoppingCart, Star, ShieldCheck, Zap, Menu, X, Trash2, CheckCircle2 } from 'lucide-react';
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

export default function PublicSitePage() {
    const params = useParams();
    const router = useRouter();
    const [site, setSite] = useState<SiteBuilderOutput & { id: string } | null>(null);
    const [products, setProducts] = useState<ProductDrop[]>([]);
    const [cart, setCart] = useState<{ product: ProductDrop; quantity: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const siteId = params.id as string;

    useEffect(() => {
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
        
        // Use the first item for the checkout flow (MVP limitation)
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
            {/* Navigation */}
            <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
                            <Store className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-black italic tracking-tighter">{site.storeName}</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <a href="#home" className="hover:text-primary transition-colors">Home</a>
                        <a href="#shop" className="hover:text-primary transition-colors">Shop</a>
                        <a href="#about" className="hover:text-primary transition-colors">Our Story</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <ShoppingCart className="h-6 w-6" />
                                    {cart.length > 0 && (
                                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full" style={{ backgroundColor: accentColor }}>
                                            {cart.length}
                                        </Badge>
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Your Shopping Cart</SheetTitle>
                                    <SheetDescription>Review your items before secure checkout.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-8 space-y-4 flex-1 overflow-y-auto">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-12">
                                            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                                            <p className="text-muted-foreground">Your cart is empty</p>
                                        </div>
                                    ) : (
                                        cart.map((item) => (
                                            <div key={item.product.id} className="flex gap-4 p-2 border rounded-xl">
                                                <div className="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
                                                    <Image src={item.product.imageDataUris[0]} alt={item.product.title} fill className="object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm truncate">{item.product.title}</p>
                                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                    <p className="font-black text-sm mt-1" style={{ color: themeColor }}>₹{item.product.price}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {cart.length > 0 && (
                                    <SheetFooter className="mt-8 border-t pt-6 flex flex-col gap-4">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="font-bold">Total</span>
                                            <span className="text-2xl font-black" style={{ color: themeColor }}>₹{cartTotal}</span>
                                        </div>
                                        <Button className="w-full h-12 text-lg font-bold" style={{ backgroundColor: themeColor }} onClick={handleCheckout}>
                                            Checkout Now
                                        </Button>
                                        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                                            <ShieldCheck className="h-3 w-3" /> Powered by SnazzPay Secure COD
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
            <section id="home" className="relative pt-20 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <Badge variant="secondary" className="px-4 py-1 text-sm font-bold tracking-widest uppercase" style={{ color: themeColor, backgroundColor: `${themeColor}15` }}>
                            {site.slogan}
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-none">
                            Discover the <span style={{ color: themeColor }}>Future</span> of <br/> {site.storeName}
                        </h1>
                        <p className="max-w-2xl mx-auto text-xl text-slate-600">
                            We bring you premium products, exceptional quality, and an AI-driven shopping experience tailored just for you.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" className="h-14 px-10 text-lg font-bold shadow-xl hover:scale-105 transition-transform" style={{ backgroundColor: themeColor }}>
                                Shop Collection
                            </Button>
                            <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold border-2">
                                Learn More
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: themeColor }}></div>
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: accentColor }}></div>
            </section>

            {/* Products Section */}
            <section id="shop" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black italic uppercase">Featured Products</h2>
                            <p className="text-muted-foreground mt-2">Curated by our AI assistant just for you.</p>
                        </div>
                        <Button variant="link" className="font-bold" style={{ color: themeColor }}>View All</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {products.map((p) => (
                            <Card key={p.id} className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white rounded-2xl">
                                <div className="relative aspect-square">
                                    <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button className="font-bold" onClick={() => addToCart(p)} style={{ backgroundColor: themeColor }}>
                                            Quick Add
                                        </Button>
                                    </div>
                                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-900 border-none font-bold text-[10px]">NEW</Badge>
                                </div>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{p.title}</h3>
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span className="text-[10px] font-bold">4.9</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">{p.description}</p>
                                    <div className="flex justify-between items-center pt-4 border-t">
                                        <span className="text-xl font-black text-slate-900">₹{p.price}</span>
                                        <Badge variant="secondary" className="text-[10px] font-bold uppercase">{p.category}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: themeColor }}>
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <h4 className="text-xl font-bold">Secure Payments</h4>
                            <p className="text-muted-foreground">Powered by SnazzPay Secure COD. Pay only when your order ships.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: accentColor }}>
                                <Zap className="h-8 w-8" />
                            </div>
                            <h4 className="text-xl font-bold">Instant Support</h4>
                            <p className="text-muted-foreground">Our AI Assistant is available 24/7 to help with any questions.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: themeColor }}>
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h4 className="text-xl font-bold">Quality Assured</h4>
                            <p className="text-muted-foreground">Every product in our collection is handpicked for excellence.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Chatbot */}
            <SiteChatbot 
                siteId={siteId} 
                welcomeMessage={site.welcomeMessage} 
                themeColor={themeColor} 
                persona={site.aiPersona}
                storeName={site.storeName}
            />

            {/* Footer */}
            <footer className="py-12 border-t bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <p className="text-2xl font-black italic tracking-tighter mb-2">{site.storeName}</p>
                        <p className="text-slate-400 text-sm">{site.slogan}</p>
                    </div>
                    <div className="flex gap-6 text-sm text-slate-300">
                        <a href="#" className="hover:text-white">Privacy Policy</a>
                        <a href="#" className="hover:text-white">Terms of Service</a>
                        <a href="#" className="hover:text-white">Contact Us</a>
                    </div>
                    <div className="text-slate-500 text-xs flex items-center gap-2">
                        Powered by <span className="font-bold text-white italic">SnazzPay AI</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

    