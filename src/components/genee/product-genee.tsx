
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
    fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'geneeCartAdd' })
    });
    toast({ title: "Added to Cart!", description: `${prod.title} is ready.` });
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
      <DialogContent className="max-w-[95vw] w-full md:max-w-7xl h-[90vh] p-0 border-none overflow-hidden rounded-[32px] bg-slate-50 shadow-2xl">
        <div className="flex flex-col h-full w-full">
          {/* Header */}
          <div className="bg-white px-6 py-3 border-b flex items-center justify-between shrink-0">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Discovery Engine...</span>
             </div>
             <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setActiveView(activeView === 'cart' ? 'grid' : 'cart')} 
                    className="relative h-10 w-10 rounded-full hover:bg-slate-100"
                >
                    <ShoppingCart className="h-5 w-5 text-slate-600" />
                    {cart.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-blue-500 text-[10px] animate-pulse">
                            {cart.length}
                        </Badge>
                    )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-10 w-10 rounded-full hover:bg-slate-100"><X className="h-6 w-6 text-slate-400"/></Button>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Left Pane: Discovery Grid */}
            <div className="flex-1 flex flex-col bg-white border-r">
                <div className="p-6 border-b flex items-center justify-between gap-4 shrink-0">
                    <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">
                        {activeView === 'grid' ? 'Recommendations' : 'Shopping Bag'}
                    </h2>
                    {activeView === 'grid' && (
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input 
                                placeholder="Search catalog..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-slate-50 border-none rounded-full text-xs font-bold"
                            />
                        </div>
                    )}
                </div>

                <ScrollArea className="flex-1 p-6">
                    {activeView === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                            {filteredProducts.map((p) => (
                                <Card key={p.id} className="rounded-[24px] overflow-hidden border-2 border-transparent hover:border-blue-100 transition-all shadow-sm bg-white group">
                                    <div className="relative aspect-[4/5] bg-slate-50">
                                        <Image src={(p.imageDataUris || [])[0] || (p.imageUrl)} alt={p.title} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                    </div>
                                    <CardContent className="p-4 space-y-1">
                                        <h3 className="text-[11px] font-black uppercase text-slate-800 line-clamp-1 truncate">{p.title}</h3>
                                        <p className="text-sm font-black text-blue-600">₹{p.price || p.costPrice}</p>
                                    </CardContent>
                                    <CardFooter className="p-2 pt-0 gap-2">
                                        <Button onClick={() => addToCart(p)} className="flex-1 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-100">
                                            <ShoppingCart className="h-4 w-4 mr-2" /> Add
                                        </Button>
                                        <Button variant="outline" size="icon" onClick={() => addToCart(p)} className="h-10 w-10 rounded-xl border-slate-200">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-xl mx-auto space-y-6 py-8">
                             {cart.length === 0 ? (
                                 <div className="text-center py-20 opacity-20"><ShoppingBag className="h-20 w-20 mx-auto" /><p className="mt-4 font-bold">Bag is empty</p></div>
                             ) : (
                                <>
                                    {cart.map(item => (
                                        <div key={item.product.id} className="bg-white border-2 border-slate-100 rounded-3xl p-5 flex gap-4 items-center">
                                            <div className="relative h-20 w-20 rounded-2xl overflow-hidden shrink-0 border"><Image src={item.product.imageDataUris?.[0] || item.product.imageUrl} fill alt="p" className="object-cover" unoptimized /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-xs uppercase truncate text-slate-800">{item.product.title}</p>
                                                <p className="text-xs font-bold text-slate-400">Quantity: {item.quantity}</p>
                                                <p className="font-black text-lg text-blue-600 mt-1">₹{(item.product.price || item.product.costPrice) * item.quantity}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 rounded-full" onClick={() => removeFromCart(item.product.id)}><Trash2 className="h-5 w-5"/></Button>
                                        </div>
                                    ))}
                                    <div className="pt-8 border-t-2 border-dashed border-slate-200 mt-10">
                                        <div className="flex justify-between items-center mb-8">
                                            <span className="font-black text-slate-400 uppercase text-xs tracking-widest">Estimated Total</span>
                                            <span className="text-4xl font-black italic text-slate-900">₹{cartTotal.toFixed(2)}</span>
                                        </div>
                                        <Button onClick={handleCheckout} className="w-full h-20 rounded-3xl bg-blue-500 hover:bg-blue-600 text-2xl font-black uppercase italic shadow-2xl shadow-blue-200">
                                            Confirm Secure COD <ArrowRight className="ml-2 h-8 w-8"/>
                                        </Button>
                                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase mt-6 flex items-center justify-center gap-2">
                                            <ShieldCheck className="h-4 w-4" /> Powered by SnazzPay Trust Wallet
                                        </p>
                                    </div>
                                </>
                             )}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right Pane: AI Chat Assistant */}
            <div className="w-full md:w-[380px] lg:w-[450px] flex flex-col bg-[#f0f2f5] border-l">
                <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg"><Sparkles className="h-5 w-5 text-blue-500" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800">Star Girl Assistant</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Online & Ready ✨</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex flex-col gap-2", m.role === 'user' ? "items-end" : "items-start")}>
                            <div className={cn(
                                "max-w-[95%] p-4 rounded-[24px] text-[13px] leading-relaxed shadow-sm break-words overflow-wrap-anywhere",
                                m.role === 'assistant' ? "bg-white text-slate-800 rounded-tl-none border" : "bg-blue-500 text-white rounded-tr-none font-medium"
                            )}>
                                {m.content}
                            </div>
                            {m.searchSuggestions && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {m.searchSuggestions.map(s => (
                                        <button key={s} onClick={() => handleSend(s)} className="text-[10px] font-black text-blue-500 border-2 border-blue-100 bg-white px-4 py-1.5 rounded-full hover:bg-blue-50 transition-colors uppercase italic tracking-tighter">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex flex-col gap-2 items-start animate-pulse">
                            <div className="bg-white p-4 rounded-[24px] rounded-tl-none border shadow-sm">
                                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white border-t space-y-4 shrink-0">
                    <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all">
                        <Input 
                            placeholder="Type a message..." 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            className="bg-transparent border-none focus-visible:ring-0 text-sm font-bold"
                        />
                        <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="h-11 w-11 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-lg shrink-0">
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                    <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">Powered by <span className="text-blue-500 font-black italic">Snazzify AI</span></p>
                </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
