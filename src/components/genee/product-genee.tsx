'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, User, Loader2, Star, ShoppingCart, ShieldCheck, Tag, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSiteAssistant } from '@/ai/flows/site-chatbot-flow';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  bundleOffer?: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hii! I'm your ASK.ME Star Girl! ✨ Looking at this ${product.title}? It's stunning for only ₹${product.price}. Want to see more from this collection or find something that matches?` 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askSiteAssistant({
        siteId: product.id,
        storeName: storeName,
        persona: `You are the ASK.ME Star Girl, a cheerful, futuristic, and expert sales assistant. 
        You look like a star-themed holographic girl. Use emojis like ✨, ⭐, 🚀.
        Focus on selling items from the provided catalog.
        Always promote "Secure COD" as the safest way to buy.`,
        query: userMsg,
        catalog: allProducts.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: p.price || p.costPrice,
            category: p.category || '',
            image: p.imageDataUris[0]
        })),
        history: messages.map(m => ({ role: m.role, content: m.content }))
      });

      const recs = response.recommendedProductIds 
        ? allProducts.filter(p => response.recommendedProductIds?.includes(p.id))
        : [];

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer,
        recommendations: recs,
        bundleOffer: response.bundleDiscountOffer
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My star-circuits are flickering! Can you try again? ✨" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyNow = (pId: string) => {
    const params = new URLSearchParams();
    params.set('id', pId);
    params.set('sellerName', storeName);
    router.push(`/catalogue?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 rounded-full relative group hover:bg-primary/10"
            title="Ask Star Girl about this product"
        >
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-genee-flash"></div>
            <div className="relative h-full w-full flex items-center justify-center">
                <Image 
                    src={placeholders.geneeHologram.src} 
                    alt="Star Girl" 
                    fill 
                    className="object-cover p-1 mix-blend-screen brightness-125 z-10 animate-pulse"
                    unoptimized
                />
                <Star className="absolute top-0 right-0 h-4 w-4 text-yellow-400 fill-yellow-400 animate-spin-slow z-20" />
            </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 border-none overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <Card className="border-none shadow-none flex flex-col h-[700px]">
          <CardHeader className="bg-slate-950 text-white p-6 relative shrink-0">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-black animate-genee-flash">
                  <Image 
                      src={placeholders.geneeAvatar.src} 
                      alt="Star Girl" 
                      fill 
                      className="object-cover mix-blend-screen brightness-150"
                      unoptimized
                  />
                </div>
                <div>
                  <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                    Star Girl <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  </CardTitle>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1">
                      <ShieldCheck className="h-2.5 w-2.5" /> AI Personal Shopper
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/10 rounded-full">
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50" ref={scrollRef}>
             <Card className="border-2 border-primary/20 bg-white overflow-hidden rounded-2xl shadow-sm">
                <div className="flex gap-4 p-3">
                    <div className="relative h-20 w-20 rounded-xl border overflow-hidden shrink-0 bg-white">
                        <Image src={product.imageDataUris[0]} alt={product.title} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Current View</p>
                            <p className="text-sm font-bold line-clamp-1">{product.title}</p>
                            <p className="text-lg font-black text-primary">₹{product.price}</p>
                        </div>
                        <Button size="sm" onClick={() => handleBuyNow(product.id)} className="h-8 rounded-lg font-black text-[10px] uppercase italic">
                            <ShoppingCart className="mr-1 h-3 w-3" /> Buy Now
                        </Button>
                    </div>
                </div>
             </Card>

            {messages.map((m, i) => (
              <div key={i} className={cn(
                "space-y-4",
                m.role === 'user' ? "ml-auto max-w-[80%]" : "mr-auto max-w-[95%]"
              )}>
                <div className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2",
                    m.role === 'assistant' ? "bg-slate-950 border-primary shadow-lg animate-genee-flash" : "bg-primary text-white border-primary"
                    )}>
                    {m.role === 'assistant' ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                    "p-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                    m.role === 'assistant' ? "bg-white border-2 border-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium shadow-md shadow-primary/20"
                    )}>
                    {m.content}
                    </div>
                </div>

                {m.recommendations && m.recommendations.length > 0 && (
                    <div className="pl-11 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest">
                            <Sparkles className="h-3 w-3" /> Top Picks for You
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
                            {m.recommendations.map(p => (
                                <Card key={p.id} className="min-w-[180px] w-[180px] rounded-2xl overflow-hidden shadow-sm border-2 hover:border-primary/50 transition-colors bg-white shrink-0">
                                    <div className="relative aspect-square">
                                        <Image src={p.imageDataUris[0]} alt={p.title} fill className="object-cover" unoptimized />
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-white/90 text-primary font-black text-[9px]">₹{p.price || p.costPrice}</Badge>
                                        </div>
                                    </div>
                                    <CardContent className="p-3 space-y-2">
                                        <p className="text-[11px] font-bold truncate uppercase italic">{p.title}</p>
                                        <Button size="sm" onClick={() => handleBuyNow(p.id)} className="w-full h-8 text-[9px] font-black uppercase italic rounded-lg">
                                            Add to Cart
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {m.bundleOffer && (
                    <div className="pl-11">
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-primary/20 p-5 rounded-[24px] shadow-sm flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-inner shrink-0">
                                <Percent className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Bundle & Save ✨</p>
                                <p className="text-xs font-bold text-slate-800 leading-relaxed italic">"{m.bundleOffer}"</p>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 mr-auto max-w-[80%]">
                <div className="w-8 h-8 rounded-xl bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0 shadow-lg animate-genee-flash">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
                <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl rounded-tl-none text-xs italic text-muted-foreground animate-pulse">
                  Star Girl is searching our vaults... ✨
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-5 border-t bg-white shrink-0">
            <div className="flex w-full gap-2 bg-slate-100 p-1.5 rounded-[24px]">
              <Input 
                placeholder="Ask me for matching jewelry... ✨" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-medium"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-full h-12 w-12 shadow-xl bg-slate-950 hover:bg-slate-900 transition-transform active:scale-90">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Dialog>
  );
}
