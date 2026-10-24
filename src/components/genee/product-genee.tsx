
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, User, Loader2, Star, ShoppingCart, ShieldCheck, Tag, Percent, Globe, ExternalLink, Search, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSiteAssistant } from '@/ai/flows/site-chatbot-flow';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  recommendations?: any[];
  externalRecommendations?: any[];
  bundleOffer?: string;
  searchSuggestions?: string[];
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
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hii! I'm your ASK.ME Discovery Engine! ✨ Ready to find your perfect look? Looking at this stunning ${product.title}? I can find matching accessories or show you our full vault! 🚀`,
        searchSuggestions: ["Tell me about this item", "Show matching shoes", "How safe is Secure COD?"]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (forcedQuery?: string) => {
    const userMsg = forcedQuery || input.trim();
    if (!userMsg || isLoading) return;

    if (!forcedQuery) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askSiteAssistant({
        siteId: product.id,
        storeName: storeName,
        persona: `You are the ASK.ME Star Girl, an expert high-tech sales search engine. 
        Focus on selling items and finding matches. Use emojis like ✨, ⭐, 🚀.`,
        query: userMsg,
        catalog: (allProducts || []).map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: p.price || p.costPrice,
            category: p.category || '',
            image: (p.imageDataUris || [])[0]
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
        externalRecommendations: response.externalRecommendations,
        bundleOffer: response.bundleDiscountOffer,
        searchSuggestions: response.searchSuggestions
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My star-circuits are flickering! Can you try searching again? ✨" }]);
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
        <Badge className="bg-white/90 text-primary font-black italic text-[9px] px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse cursor-pointer border-2 border-primary/20 transition-transform hover:scale-105 active:scale-95">
            <Star className="h-2 w-2 fill-primary" /> ASK ME
        </Badge>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] p-0 border-none overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <Card className="border-none shadow-none flex flex-col h-[750px]">
          <CardHeader className="bg-slate-950 text-white p-6 relative shrink-0">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-black animate-genee-flash">
                  <Image src={placeholders.geneeAvatar.src} alt="Star Girl" fill className="object-cover mix-blend-screen brightness-150" unoptimized />
                </div>
                <div>
                  <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                    Discovery Engine <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
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
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50" ref={scrollRef}>
             {/* Search Chips */}
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_SEARCH_CHIPS.map(chip => (
                    <Button key={chip} variant="outline" size="sm" onClick={() => handleSend(chip)} className="rounded-full bg-white border-primary/20 text-[10px] font-bold h-7 px-4 whitespace-nowrap hover:bg-primary hover:text-white transition-colors">
                        {chip}
                    </Button>
                ))}
             </div>

             <Card className="border-2 border-primary/20 bg-white overflow-hidden rounded-2xl shadow-sm">
                <div className="flex gap-4 p-3">
                    <div className="relative h-20 w-20 rounded-xl border overflow-hidden shrink-0 bg-white">
                        <Image src={(product.imageDataUris || [])[0] || placeholders.heroPlaceholder.src} alt={product.title} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <p className="text-[10px] font-black uppercase text-slate-400">Inspecting</p>
                        <p className="text-sm font-bold line-clamp-1">{product.title}</p>
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-black text-primary">₹{product.price}</span>
                            <Button size="sm" onClick={() => handleBuyNow(product.id)} className="h-8 rounded-lg font-black text-[10px] uppercase italic">
                                <ShoppingCart className="mr-1 h-3 w-3" /> Buy Now
                            </Button>
                        </div>
                    </div>
                </div>
             </Card>

            {messages.map((m, i) => (
              <div key={i} className={cn("space-y-4", m.role === 'user' ? "ml-auto max-w-[80%]" : "mr-auto max-w-[95%]")}>
                <div className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "")}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2", m.role === 'assistant' ? "bg-slate-950 border-primary animate-genee-flash" : "bg-primary text-white border-primary")}>
                        {m.role === 'assistant' ? <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={cn("p-4 rounded-3xl text-sm shadow-sm leading-relaxed", m.role === 'assistant' ? "bg-white border-2 border-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium shadow-md shadow-primary/20")}>
                        {m.content}
                    </div>
                </div>

                {m.searchSuggestions && m.searchSuggestions.length > 0 && (
                    <div className="pl-11 flex flex-wrap gap-2">
                        {m.searchSuggestions.map(s => (
                            <button key={s} onClick={() => handleSend(s)} className="text-[10px] font-bold text-primary hover:underline italic">✨ {s}</button>
                        ))}
                    </div>
                )}

                {m.recommendations && m.recommendations.length > 0 && (
                    <div className="pl-11 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary tracking-widest"><TrendingUp className="h-3 w-3" /> Internal Match Engine</div>
                        <div className="flex gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
                            {m.recommendations.map(p => (
                                <Card key={p.id} className="min-w-[200px] rounded-2xl overflow-hidden shadow-sm border-2 border-slate-100 hover:border-primary bg-white shrink-0">
                                    <div className="relative aspect-square"><Image src={(p.imageDataUris || [])[0]} alt={p.title} fill className="object-cover" unoptimized /></div>
                                    <div className="p-3 space-y-2">
                                        <p className="text-[11px] font-bold truncate uppercase">{p.title}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-primary">₹{p.price || p.costPrice}</span>
                                            <Button size="sm" onClick={() => handleBuyNow(p.id)} className="h-7 rounded-lg text-[9px] font-black uppercase italic">Add</Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {m.externalRecommendations && m.externalRecommendations.length > 0 && (
                    <div className="pl-11 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 tracking-widest"><Globe className="h-3 w-3" /> Live from Snazzify Global</div>
                        <div className="flex gap-3 overflow-x-auto pb-4 pr-4 scrollbar-hide">
                            {m.externalRecommendations.map((p, idx) => (
                                <Card key={idx} className="min-w-[200px] rounded-2xl overflow-hidden shadow-sm border-2 border-indigo-100 bg-white shrink-0">
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
                    <div className="pl-11">
                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-primary/20 p-5 rounded-[24px] shadow-sm flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center shrink-0"><Percent className="h-5 w-5 text-primary" /></div>
                            <div><p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Bundle & Save ✨</p><p className="text-xs font-bold text-slate-800 italic">"{m.bundleOffer}"</p></div>
                        </div>
                    </div>
                )}
              </div>
            ))}
          </CardContent>

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
        </Card>
      </DialogContent>
    </Dialog>
  );
}
