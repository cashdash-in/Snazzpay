
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    Star, X, Send, User, Loader2, 
    ShoppingCart, ShieldCheck, Tag, Percent, 
    Globe, Search, TrendingUp, 
    ShoppingBag, Trash2, Zap, Plus,
    ArrowRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  externalRecommendations?: any[];
  searchSuggestions?: string[];
}

interface CartItem {
    product: any;
    quantity: number;
}

interface ProductGeneeProps {
  product?: any;
  allProducts: any[];
  storeName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductGenee({ product, allProducts, storeName, isOpen, onOpenChange }: ProductGeneeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'grid' | 'cart'>('grid');
  
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hii! I'm your AI Shopping Assistant for ${storeName}. ✨ I've analyzed our catalog and found the best matches for you.\n\nWhat are you looking for today?`,
        searchSuggestions: ["Best Sellers", "Compare prices", "New arrivals"]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // GUARANTEED SCROLL TO BOTTOM LOGIC
  useEffect(() => {
    if (scrollRef.current) {
        const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
  }, [messages, isLoading]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price || item.product.costPrice || 0) * item.quantity, 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allProducts || [];
    const lowerQuery = searchQuery.toLowerCase();
    return (allProducts || []).filter(p => 
        p.title.toLowerCase().includes(lowerQuery) || 
        (p.category || '').toLowerCase().includes(lowerQuery)
    );
  }, [allProducts, searchQuery]);

  const addToCart = (prod: any) => {
    setCart(prev => {
        const existing = prev.find(item => item.product.id === prod.id);
        if (existing) {
            return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { product: prod, quantity: 1 }];
    });
    fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'geneeCartAdd' })
    });
    toast({ title: "Added to Cart!", description: `${prod.title} is ready.` });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleSend = async (forcedQuery?: string) => {
    const userMsg = forcedQuery || input.trim();
    if (!userMsg || isLoading) return;

    if (!forcedQuery) setInput('');
    
    // Track Genee Search
    fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'geneeSearch' })
    });

    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            storeName: storeName,
            query: userMsg,
            catalog: (allProducts || []).slice(0, 8).map(p => ({
                id: p.id,
                title: p.title,
                price: p.price || p.costPrice,
                category: p.category || ''
            }))
        })
      });
      
      const response = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer || "I found some great options for you! ✨",
        recommendations: response.recommendedProductIds ? (allProducts || []).filter(p => response.recommendedProductIds.includes(p.id)) : [],
        externalRecommendations: response.externalRecommendations,
        searchSuggestions: response.searchSuggestions
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm recalibrating my star-sensors! ✨ Try another question?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const firstItem = cart[0].product;
    router.push(`/catalogue?id=${firstItem.id}&sellerName=${encodeURIComponent(storeName)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full md:max-w-7xl h-[90vh] p-0 border-none overflow-hidden rounded-[32px] bg-slate-50 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Retail Discovery Terminal</span>
             </div>
             <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setActiveView(activeView === 'cart' ? 'grid' : 'cart')} 
                    className="relative h-12 w-12 rounded-full hover:bg-slate-100 transition-all active:scale-95"
                >
                    <ShoppingCart className="h-6 w-6 text-slate-700" />
                    {cart.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center bg-blue-500 text-[11px] font-black animate-pulse border-2 border-white">
                            {cart.length}
                        </Badge>
                    )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10 rounded-full hover:bg-slate-100"><X className="h-6 w-6 text-slate-400"/></Button>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane: Discovery Grid */}
            <div className="flex-1 flex flex-col bg-white border-r min-w-0">
                <div className="p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-slate-50/50">
                    <h2 className="text-sm font-black uppercase tracking-tight text-slate-800 italic">
                        {activeView === 'grid' ? '⚡ Dynamic Recommendations' : '🛒 My Shopping Bag'}
                    </h2>
                    {activeView === 'grid' && (
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search catalog..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-11 bg-white border-2 border-slate-100 rounded-full text-xs font-bold focus-visible:ring-blue-100"
                            />
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-6">
                        {activeView === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                                {filteredProducts.map((p) => (
                                    <Card key={p.id} className="rounded-[28px] overflow-hidden border-2 border-transparent hover:border-blue-100 transition-all shadow-sm hover:shadow-xl bg-white group flex flex-col">
                                        <div className="relative aspect-[4/5] bg-slate-50 overflow-hidden">
                                            <Image src={(p.imageDataUris || [])[0] || (p.imageUrl)} alt={p.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                                        </div>
                                        <CardContent className="p-4 space-y-1 flex-1">
                                            <h3 className="text-[11px] font-black uppercase text-slate-800 line-clamp-2 italic leading-tight">{p.title}</h3>
                                            <p className="text-base font-black text-blue-600">₹{p.price || p.costPrice}</p>
                                        </CardContent>
                                        <CardFooter className="p-3 pt-0 gap-2">
                                            <Button onClick={() => addToCart(p)} className="flex-1 h-11 rounded-2xl bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-100 font-bold uppercase text-[10px]">
                                                <ShoppingCart className="h-4 w-4 mr-2" /> Quick Add
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => addToCart(p)} className="h-11 w-11 rounded-2xl border-slate-200 hover:bg-slate-50">
                                                <Plus className="h-5 w-5" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <div className="col-span-full py-32 text-center space-y-4 opacity-30">
                                        <Search className="h-16 w-16 mx-auto" />
                                        <p className="font-black uppercase italic">No matching products found</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-2xl mx-auto space-y-6 py-8">
                                 {cart.length === 0 ? (
                                     <div className="text-center py-20 opacity-20"><ShoppingBag className="h-24 w-24 mx-auto" /><p className="mt-4 font-black uppercase italic">Your bag is empty</p></div>
                                 ) : (
                                    <>
                                        <div className="space-y-4">
                                            {cart.map(item => (
                                                <div key={item.product.id} className="bg-white border-2 border-slate-100 rounded-[32px] p-5 flex gap-5 items-center shadow-sm hover:border-blue-100 transition-colors">
                                                    <div className="relative h-24 w-24 rounded-2xl overflow-hidden shrink-0 border-2 border-slate-50"><Image src={item.product.imageDataUris?.[0] || item.product.imageUrl} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm uppercase truncate text-slate-800 italic">{item.product.title}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Quantity: {item.quantity}</p>
                                                        <p className="font-black text-xl text-blue-600 mt-2">₹{(item.product.price || item.product.costPrice) * item.quantity}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full h-12 w-12" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-6 w-6"/></Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-8 border-t-4 border-dotted border-slate-200 mt-12">
                                            <div className="flex justify-between items-center mb-8 bg-slate-50 p-6 rounded-[32px]">
                                                <span className="font-black text-slate-400 uppercase text-xs tracking-widest">Final Amount</span>
                                                <span className="text-5xl font-black italic text-slate-900 tracking-tighter">₹{cartTotal.toFixed(2)}</span>
                                            </div>
                                            <Button onClick={handleCheckout} className="w-full h-24 rounded-[36px] bg-blue-500 hover:bg-blue-600 text-3xl font-black uppercase italic shadow-2xl shadow-blue-200 transform hover:scale-[1.02] transition-all">
                                                Go to Checkout <ArrowRight className="ml-3 h-10 w-10"/>
                                            </Button>
                                            <p className="text-center text-[11px] font-black text-slate-400 uppercase mt-8 flex items-center justify-center gap-3">
                                                <ShieldCheck className="h-5 w-5 text-blue-500" /> Secured by SnazzPay Trust Wallet
                                            </p>
                                        </>
                                 )}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Pane: AI Chat Assistant */}
            <div className="w-full md:w-[400px] lg:w-[480px] flex flex-col bg-[#f8fafc] border-l shrink-0">
                <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 rounded-2xl shadow-sm border border-blue-100"><Sparkles className="h-6 w-6 text-blue-500" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800 italic tracking-tight">Star Girl Assistant</h3>
                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                                Live Intelligence ✨
                            </p>
                        </div>
                    </div>
                </div>

                {/* SCROLLER AREA */}
                <ScrollArea className="flex-1" ref={scrollRef}>
                    <div className="p-6 space-y-6">
                        {messages.map((m, i) => (
                            <div key={i} className={cn("flex flex-col gap-3", m.role === 'user' ? "items-end" : "items-start")}>
                                <div className={cn(
                                    "max-w-[90%] p-5 rounded-[32px] text-[13px] leading-relaxed shadow-sm break-words overflow-wrap-anywhere border-2",
                                    m.role === 'assistant' ? "bg-white text-slate-800 rounded-tl-none border-slate-100" : "bg-blue-500 text-white rounded-tr-none font-bold border-blue-400 shadow-blue-100"
                                )}>
                                    {m.content}
                                </div>
                                {m.searchSuggestions && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {m.searchSuggestions.map(s => (
                                            <button key={s} onClick={() => handleSend(s)} className="text-[10px] font-black text-blue-600 border-2 border-blue-100 bg-white px-4 py-2 rounded-full hover:bg-blue-50 hover:border-blue-200 transition-all uppercase italic tracking-tighter active:scale-95 shadow-sm">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex flex-col gap-3 items-start">
                                <div className="bg-white p-5 rounded-[32px] rounded-tl-none border-2 border-slate-100 shadow-sm flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase italic tracking-widest animate-pulse">Thinking...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="p-6 bg-white border-t space-y-4 shrink-0 shadow-[0_-10px_25px_rgba(0,0,0,0.02)]">
                    <div className="flex gap-2 bg-slate-50 p-2.5 rounded-[30px] border-2 border-slate-100 focus-within:border-blue-200 focus-within:bg-white transition-all shadow-inner">
                        <Input 
                            placeholder="Ask me anything... ✨" 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="bg-transparent border-none focus-visible:ring-0 text-sm font-bold placeholder:text-slate-300 h-12"
                        />
                        <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="h-12 w-12 rounded-full bg-blue-500 hover:bg-blue-600 shadow-xl shadow-blue-100 shrink-0 transform active:scale-90 transition-transform">
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center justify-center gap-2 opacity-30">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Powered by Snazzify Star Intelligence</p>
                    </div>
                </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
