
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
    ArrowRight, Sparkles, Moon, Sun
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function ProductGenee({ product, allProducts, storeName }: ProductGeneeProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveTab] = useState<'grid' | 'cart'>('grid');
  
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hii! I'm your AI Shopping Assistant for ${storeName}. ✨ I've analyzed our catalog and found the best matches for you.\n\nWhat are you looking for today?`,
        searchSuggestions: ["Best Sellers", "Compare prices", "New arrivals"]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    toast({ title: "Added to Cart!", description: `${prod.title} is ready.` });
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

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            siteId: product.id,
            storeName: storeName,
            query: userMsg,
            catalog: (allProducts || []).slice(0, 15).map(p => ({
                id: p.id,
                title: p.title,
                price: p.price || p.costPrice,
                category: p.category || ''
            }))
        })
      });
      
      if (!res.ok) throw new Error("API error");
      const response = await res.json();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer || "I found some great options for you! ✨",
        recommendations: response.recommendedProductIds ? (allProducts || []).filter(p => response.recommendedProductIds.includes(p.id)) : [],
        externalRecommendations: response.externalRecommendations,
        bundleOffer: response.bundleOffer,
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
    const params = new URLSearchParams();
    params.set('id', firstItem.id);
    params.set('sellerName', storeName);
    router.push(`/catalogue?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Badge className="bg-white/95 text-primary font-black italic text-[11px] px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-genee-flash cursor-pointer border-2 border-primary/30 transition-transform hover:scale-110 active:scale-95">
            <Star className="h-3 w-3 fill-primary" /> ASK ME
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full md:max-w-7xl h-[90vh] p-0 border-none overflow-hidden rounded-[32px] bg-[#f8f9fa] shadow-2xl">
        <div className="flex flex-col h-full w-full">
          {/* Top Status Bar */}
          <div className="bg-slate-100/80 px-6 py-2 border-b flex items-center justify-between shrink-0">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Comparing prices across the catalog...</span>
             </div>
             <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900"><Moon className="h-4 w-4"/></Button>
                <div className="relative group">
                    <Button variant="ghost" size="icon" onClick={() => setActiveTab('cart')} className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900 relative">
                        <ShoppingCart className="h-4 w-4" />
                        {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-blue-500 text-[8px] border-none">{cart.length}</Badge>}
                    </Button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-900"><X className="h-5 w-5"/></Button>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Side: Product Recommendations Grid */}
            <div className="flex-1 flex flex-col bg-white border-r">
                <div className="p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-500" />
                        <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">Recommendations <span className="ml-1 text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">{filteredProducts.length}</span></h2>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search products" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-slate-50 border-none rounded-full text-xs font-medium"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-6">
                    {activeView === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                            {filteredProducts.map((p) => (
                                <Card key={p.id} className="rounded-[24px] overflow-hidden border-2 border-transparent hover:border-blue-100 transition-all group shadow-sm bg-white">
                                    <div className="relative aspect-[4/5] bg-slate-50">
                                        <Image src={(p.imageDataUris || [])[0]} alt={p.title} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                        <div className="absolute top-3 left-3">
                                            <Badge className="bg-white/90 text-blue-600 text-[8px] font-black uppercase shadow-sm border-none">{p.category || 'New'}</Badge>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 space-y-2">
                                        <h3 className="text-[11px] font-black uppercase text-slate-800 line-clamp-1 truncate leading-none">{p.title}</h3>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-sm font-black text-slate-900">₹{p.price || p.costPrice}</span>
                                            {p.originalPrice && <span className="text-[10px] text-slate-400 line-through">₹{p.originalPrice}</span>}
                                            <span className="text-[9px] font-bold text-red-500">70% off</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-2 pt-0 flex gap-2">
                                        <Button onClick={() => addToCart(p)} className="flex-1 h-9 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200">
                                            <ShoppingCart className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" onClick={() => addToCart(p)} size="icon" className="h-9 w-9 rounded-xl border-slate-200 text-blue-500">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-xl mx-auto space-y-4 py-8">
                             <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black uppercase italic">Your Shopping Bag</h3>
                                <Button variant="ghost" onClick={() => setActiveTab('grid')} className="text-xs font-bold text-blue-500">Back to Store</Button>
                             </div>
                             {cart.length === 0 ? (
                                 <div className="text-center py-20 opacity-20"><ShoppingBag className="h-20 w-20 mx-auto" /><p className="mt-4 font-bold">Your bag is empty</p></div>
                             ) : (
                                <>
                                    {cart.map(item => (
                                        <div key={item.product.id} className="bg-white border rounded-2xl p-4 flex gap-4 items-center">
                                            <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0"><Image src={item.product.imageDataUris[0]} fill alt="p" className="object-cover" /></div>
                                            <div className="flex-1"><p className="font-bold text-xs uppercase">{item.product.title}</p><p className="font-black text-sm text-blue-600">₹{(item.product.price || item.product.costPrice) * item.quantity}</p></div>
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    ))}
                                    <div className="pt-6 border-t mt-10">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="font-bold text-slate-400 uppercase text-xs">Total Amount</span>
                                            <span className="text-3xl font-black italic">₹{cartTotal.toFixed(2)}</span>
                                        </div>
                                        <Button onClick={handleCheckout} className="w-full h-16 rounded-2xl bg-blue-500 text-xl font-black uppercase italic shadow-xl shadow-blue-200">
                                            Confirm Order <ArrowRight className="ml-2 h-6 w-6"/>
                                        </Button>
                                    </div>
                                </>
                             )}
                        </div>
                    )}
                </ScrollArea>
                
                {/* Bottom Left Badge */}
                <div className="p-6 shrink-0 bg-white border-t">
                    <Button variant="ghost" className="h-14 px-8 rounded-2xl bg-blue-500 text-white font-black uppercase italic tracking-tight shadow-xl shadow-blue-200 group">
                        <ShoppingBag className="mr-3 h-6 w-6 fill-current" />
                        BLUEPOINTS
                    </Button>
                </div>
            </div>

            {/* Right Side: Chat Assistant Pane */}
            <div className="w-full md:w-[380px] lg:w-[450px] flex flex-col bg-[#f0f2f5] border-l">
                <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg"><Sparkles className="h-5 w-5 text-blue-500" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800">Shopping Assistant</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Always Online</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><Edit className="h-4 w-4"/></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "max-w-[90%] p-4 rounded-[24px] text-[13px] leading-relaxed shadow-sm",
                                m.role === 'assistant' ? "bg-white text-slate-800 rounded-tl-none border" : "bg-blue-500 text-white rounded-tr-none font-medium"
                            )}>
                                {m.content}
                            </div>
                            {m.searchSuggestions && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {m.searchSuggestions.map(s => (
                                        <button key={s} onClick={() => handleSend(s)} className="text-[10px] font-bold text-blue-500 border border-blue-200 bg-white px-3 py-1 rounded-full hover:bg-blue-50">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex flex-col gap-2 items-start animate-pulse">
                            <div className="bg-white p-4 rounded-[24px] rounded-tl-none border">
                                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t space-y-4 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        {QUICK_SEARCH_CHIPS.map(chip => (
                            <Button key={chip} variant="outline" size="sm" onClick={() => handleSend(chip)} className="h-8 rounded-lg border-slate-200 text-slate-600 text-[10px] font-bold px-4 hover:border-blue-500 hover:text-blue-500 transition-colors">
                                {chip}
                            </Button>
                        ))}
                    </div>
                    <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all">
                        <Input 
                            placeholder="Type a message..." 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="bg-transparent border-none focus-visible:ring-0 text-sm font-medium"
                        />
                        <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="h-10 w-10 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-100 shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">Powered by <span className="text-blue-500">Snazzify AI</span></p>
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const QUICK_SEARCH_CHIPS = [
  "Matching Jewelry",
  "Compare speakers",
  "Blue-exclusive deals"
];

const MAX_IMAGE_SIZE_PX = 800;
