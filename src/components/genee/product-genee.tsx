
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    Sparkles, X, Send, User, Loader2, Star, 
    ShoppingCart, ShieldCheck, Tag, Percent, 
    Globe, ExternalLink, Search, TrendingUp, 
    ShoppingBag, Trash2, ArrowRight, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  externalRecommendations?: any[];
  bundleOffer?: string;
  searchSuggestions?: string[];
}

interface CartItem {
    product: any;
    quantity: number;
}

interface ProductGeneeProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    imageDataUris: string[];
    category?: string;
  };
  allProducts: any[];
  storeName: string;
}

const QUICK_SEARCH_CHIPS = [
  "New Arrivals ✨",
  "Price: Low to High",
  "Matching Jewelry ⭐",
  "Lugra Collection",
  "Secure COD Info"
];

export function ProductGenee({ product, allProducts, storeName }: ProductGeneeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [input, setInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hii! I'm your ASK.ME Discovery Engine! ✨ Looking at this stunning ${product.title}? I can find matching accessories or show you our full vault! 🚀`,
        searchSuggestions: ["Tell me about this item", "Show matching shoes", "How safe is Secure COD?"]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activeTab]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price || item.product.costPrice || 0) * item.quantity, 0);
  }, [cart]);

  const topSellers = useMemo(() => {
    return allProducts.slice(0, 6);
  }, [allProducts]);

  const addToCart = (prod: any) => {
    setCart(prev => {
        const existing = prev.find(item => item.product.id === prod.id);
        if (existing) {
            return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { product: prod, quantity: 1 }];
    });
    toast({ title: "Added to Cart!", description: `${prod.title} is ready for checkout.` });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSend = async (forcedQuery?: string) => {
    const userMsg = forcedQuery || input.trim();
    if (!userMsg || isLoading) return;

    if (!forcedQuery) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    setActiveTab('chat');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            siteId: product.id,
            storeName: storeName,
            query: userMsg,
            catalog: (allProducts || []).slice(0, 5).map(p => ({
                id: p.id,
                title: p.title,
                price: p.price || p.costPrice,
                category: p.category || ''
            }))
        })
      });
      
      const response = await res.json();
      if (response.error) throw new Error(response.error);

      const recs = response.recommendedProductIds 
        ? allProducts.filter(p => response.recommendedProductIds?.includes(p.id))
        : [];

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer,
        recommendations: recs,
        externalRecommendations: response.externalRecommendations,
        bundleOffer: response.bundleDiscountOffer,
        searchSuggestions: response.searchSuggestions
      }]);
    } catch (error) {
      console.error("Genee API Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "My star-circuits are stabilizing! ✨ What else can I help you find in our catalog?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const firstItem = cart[0].product;
    const params = new URLSearchParams();
    params.set('id', firstItem.id);
    params.set('sellerName', storeName);
    router.push(`/catalogue?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Badge className="bg-white/90 text-primary font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse cursor-pointer border-2 border-primary/20 transition-transform hover:scale-105 active:scale-95">
            <Star className="h-2 w-2 fill-primary" /> ASK ME
        </Badge>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 border-none overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <Card className="border-none shadow-none flex flex-col h-[85vh] max-h-[750px] w-full overflow-hidden">
          <CardHeader className="bg-slate-950 text-white p-6 relative shrink-0">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-black animate-genee-flash">
                  <Image src={placeholders.geneeAvatar.src} alt="Star Girl" fill className="object-cover mix-blend-screen brightness-150" unoptimized />
                </div>
                <div>
                  <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2 leading-none">
                    Star Girl <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </CardTitle>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                      <ShieldCheck className="h-2.5 w-2.5" /> Discovery & Checkout
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab('cart')} className="relative text-white hover:bg-white/10 rounded-full h-11 w-11">
                    <ShoppingCart className="h-6 w-6" />
                    {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white p-0 flex items-center justify-center rounded-full animate-bounce text-[10px] border-none">{cart.length}</Badge>}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-full h-11 w-11">
                    <X className="h-6 w-6" />
                  </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="bg-white/10 p-1 rounded-full grid grid-cols-2">
                    <TabsTrigger value="chat" className="rounded-full text-[10px] font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">AI Search</TabsTrigger>
                    <TabsTrigger value="sellers" className="rounded-full text-[10px] font-black uppercase data-[state=active]:bg-primary data-[state=active]:text-white">Top Sellers</TabsTrigger>
                </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50/50" ref={scrollRef}>
            <Tabs value={activeTab} className="h-full">
                <TabsContent value="chat" className="h-full m-0 p-4 md:p-6 space-y-6">
                     <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                        {QUICK_SEARCH_CHIPS.map(chip => (
                            <Button key={chip} variant="outline" size="sm" onClick={() => handleSend(chip)} className="rounded-full bg-white border-primary/20 text-[10px] font-bold h-7 px-4 whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                                {chip}
                            </Button>
                        ))}
                     </div>

                    {messages.map((m, i) => (
                    <div key={i} className={cn("space-y-4 w-full flex flex-col overflow-hidden", m.role === 'user' ? "items-end" : "items-start")}>
                        <div className={cn("flex gap-3 w-full max-w-[95%] items-end", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2", m.role === 'assistant' ? "bg-slate-950 border-primary animate-genee-flash" : "bg-primary text-white border-primary")}>
                                {m.role === 'assistant' ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <User className="h-4 w-4" />}
                            </div>
                            <div className={cn(
                                "p-3.5 rounded-[24px] text-[12px] shadow-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden", 
                                m.role === 'assistant' ? "bg-white border-2 border-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium shadow-md shadow-primary/20"
                            )} style={{ wordBreak: 'break-word', maxWidth: 'calc(100% - 48px)' }}>
                                {m.content}
                            </div>
                        </div>

                        {m.searchSuggestions && m.searchSuggestions.length > 0 && (
                            <div className="pl-11 flex flex-wrap gap-2 w-full">
                                {m.searchSuggestions.map(s => (
                                    <button key={s} onClick={() => handleSend(s)} className="text-[10px] font-bold text-primary hover:underline italic">✨ {s}</button>
                                ))}
                            </div>
                        )}

                        {m.recommendations && m.recommendations.length > 0 && (
                            <div className="pl-11 space-y-3 w-full overflow-hidden">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest"><TrendingUp className="h-3 w-3" /> Internal Match Engine</div>
                                <div className="flex gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
                                    {m.recommendations.map(p => (
                                        <Card key={p.id} className="min-w-[180px] rounded-2xl overflow-hidden shadow-sm border-2 border-slate-100 hover:border-primary bg-white shrink-0">
                                            <div className="relative aspect-square"><Image src={(p.imageDataUris || [])[0]} alt={p.title} fill className="object-cover" unoptimized /></div>
                                            <div className="p-3 space-y-2">
                                                <p className="text-[11px] font-bold truncate uppercase">{p.title}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-primary">₹{p.price || p.costPrice}</span>
                                                    <Button size="sm" onClick={() => addToCart(p)} className="h-7 rounded-lg text-[9px] font-black uppercase italic">Add</Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {m.externalRecommendations && m.externalRecommendations.length > 0 && (
                            <div className="pl-11 space-y-3 w-full overflow-hidden">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 tracking-widest"><Globe className="h-3 w-3" /> Live from Snazzify Global</div>
                                <div className="flex gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
                                    {m.externalRecommendations.map((p, idx) => (
                                        <Card key={idx} className="min-w-[180px] rounded-2xl overflow-hidden shadow-sm border-2 border-indigo-100 bg-white shrink-0">
                                            <div className="relative aspect-square"><Image src={p.imageUrl} alt={p.title} fill className="object-cover" unoptimized /></div>
                                            <div className="p-3 space-y-2">
                                                <p className="text-[11px] font-bold truncate uppercase text-indigo-900">{p.title}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-indigo-600">₹{p.price}</span>
                                                    <Button size="sm" onClick={() => window.open(p.url, '_blank')} variant="outline" className="h-7 rounded-lg text-[9px] font-black uppercase border-indigo-200">View</Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {m.bundleOffer && (
                            <div className="pl-11 w-full overflow-hidden">
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-primary/20 p-5 rounded-[24px] shadow-sm flex items-start gap-4 mr-4">
                                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0"><Percent className="h-5 w-5 text-primary" /></div>
                                    <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Bundle & Save ✨</p><p className="text-xs font-bold text-slate-800 italic break-words">"{m.bundleOffer}"</p></div>
                                </div>
                            </div>
                        )}
                    </div>
                    ))}
                    {isLoading && (
                    <div className="flex gap-4 mr-auto max-w-[85%] pl-6 items-end">
                        <div className="w-10 h-10 rounded-2xl bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0 shadow-lg animate-genee-flash">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                        <div className="p-5 bg-white border-2 border-slate-100 rounded-[32px] rounded-tl-none flex items-center gap-3 shadow-sm">
                        <p className="text-[12px] italic text-muted-foreground animate-pulse">Star Girl is scouring the vault... ✨</p>
                        </div>
                    </div>
                    )}
                </TabsContent>

                <TabsContent value="sellers" className="h-full m-0 p-6">
                    <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black italic uppercase tracking-tighter">Popular in {storeName}</h3>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold">Trending Now</Badge>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            {topSellers.map(p => (
                                <Card key={p.id} className="rounded-2xl overflow-hidden border-none shadow-lg bg-white flex flex-col group">
                                    <div className="relative aspect-square">
                                        <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Button onClick={() => addToCart(p)} className="h-10 rounded-full font-black text-[10px] uppercase italic">Quick Add</Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-3 flex-grow flex flex-col justify-between">
                                        <p className="font-bold text-xs uppercase line-clamp-1 mb-1">{p.title}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-black text-primary">₹{p.price || p.costPrice}</span>
                                            <Badge variant="secondary" className="text-[8px] h-4 uppercase">{p.category}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                    </div>
                </TabsContent>

                <TabsContent value="cart" className="h-full m-0 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black italic uppercase tracking-tighter">My Shopping Bag</h3>
                        <Badge className="bg-slate-900 text-white">{cart.length} Items</Badge>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                                <ShoppingBag className="h-20 w-20" />
                                <p className="font-black uppercase italic text-xl tracking-tighter">Your bag is empty!</p>
                                <Button onClick={() => setActiveTab('sellers')} variant="outline" className="rounded-full">Go Shopping 🚀</Button>
                            </div>
                        ) : (
                            cart.map(item => (
                                <Card key={item.product.id} className="rounded-2xl overflow-hidden bg-white border-2 border-slate-100 p-3 flex gap-4">
                                    <div className="relative h-20 w-20 rounded-xl border overflow-hidden shrink-0 bg-white">
                                        <Image src={item.product.imageDataUris[0]} alt={item.product.title} fill className="object-cover" unoptimized />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-xs uppercase line-clamp-1 truncate">{item.product.title}</p>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3">
                                                <p className="text-[10px] font-bold text-muted-foreground">Qty: {item.quantity}</p>
                                                <p className="text-sm font-black text-primary">₹{(item.product.price || item.product.costPrice) * item.quantity}</p>
                                            </div>
                                            <Badge className="text-[8px] h-4 bg-green-100 text-green-700 border-none">Ready to Ship</Badge>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="mt-auto pt-6 border-t space-y-6">
                            <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase">Subtotal</span>
                                    <span className="font-black text-lg">₹{cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-green-600 uppercase">Secure COD Discount</span>
                                    <span className="font-black text-xs text-green-600">Calculated at Checkout</span>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                                    <span className="font-black uppercase italic text-sm">Total Value</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">₹{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button onClick={handleCheckout} className="w-full h-16 rounded-[24px] text-xl font-black uppercase italic shadow-2xl shadow-primary/20 gap-3">
                                <Zap className="fill-current" /> Confirm Order & Checkout
                            </Button>
                            <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <ShieldCheck className="h-4 w-4" /> Secure COD via SnazzPay Trust Wallet
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
          </CardContent>

          {activeTab === 'chat' && (
            <CardFooter className="p-5 border-t bg-white shrink-0 flex flex-col gap-3">
                <div className="flex w-full gap-2 bg-slate-100 p-1.5 rounded-[24px] border-2 border-transparent focus-within:border-primary/20 transition-all">
                    <Search className="ml-3 h-5 w-5 text-slate-400" />
                    <Input 
                        placeholder="Search our full vault... ✨" 
                        value={input} 
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        className="bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-bold"
                    />
                    <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="rounded-full h-12 w-12 shadow-xl bg-slate-950 hover:bg-slate-900 transition-transform active:scale-90">
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
                <p className="text-[9px] text-center font-black uppercase tracking-widest text-slate-400">Powered by Snazzify Discovery AI</p>
            </CardFooter>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
}
