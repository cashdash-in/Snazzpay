
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, User, Loader2, Bot, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSiteAssistant } from '@/ai/flows/site-chatbot-flow';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProductGeneeProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
  };
  storeName: string;
}

export function ProductGenee({ product, storeName }: ProductGeneeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
        role: 'assistant', 
        content: `Hi there! I'm the ASK.ME Genee. Thinking about our ${product.title}? It's a fantastic choice for ₹${product.price}. How can I help you decide?` 
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
        persona: `You are the ASK.ME Genee, a futuristic, friendly, and expert sales assistant. 
        Focus on selling this specific product: "${product.title}" (${product.description}). 
        Emphasize trust, quality, and the "Secure COD" payment method which is 100% safe. 
        Always be encouraging and helpful.`,
        query: userMsg,
        history: messages
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My holographic circuits are a bit fuzzy! Could you repeat that?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full relative group hover:bg-primary/10"
            title="Ask Genee about this product"
        >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg animate-pulse"></div>
            <Image 
                src={placeholders.geneeHologram.src} 
                alt="Genee" 
                fill 
                className="object-cover p-1 mix-blend-screen brightness-125 z-10"
                unoptimized
            />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-primary animate-spin-slow z-20" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 border-none overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <Card className="border-none shadow-none flex flex-col h-[550px]">
          <CardHeader className="bg-slate-950 text-white p-6 relative shrink-0">
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-primary shadow-lg bg-black">
                <Image 
                    src={placeholders.geneeAvatar.src} 
                    alt="Genee" 
                    fill 
                    className="object-cover mix-blend-screen brightness-150"
                    unoptimized
                />
              </div>
              <div>
                <CardTitle className="text-lg font-black italic tracking-tighter uppercase">Product Genee</CardTitle>
                <p className="text-[9px] text-primary font-bold uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="h-2.5 w-2.5" /> AI Sales Assistant
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
             <div className="p-3 bg-primary/5 border rounded-2xl flex gap-3 items-center mb-2">
                <div className="relative h-12 w-12 rounded-lg border overflow-hidden shrink-0 bg-white">
                    <Image src={placeholders.heroPlaceholder.src} alt={product.title} fill className="object-cover opacity-50" unoptimized />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Discussing</p>
                    <p className="text-xs font-bold truncate max-w-[200px]">{product.title}</p>
                </div>
             </div>

            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex gap-2 max-w-[90%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                  m.role === 'assistant' ? "bg-slate-950 border-primary" : "bg-primary text-white border-primary"
                )}>
                  {m.role === 'assistant' ? <Sparkles className="h-4 w-4 text-white" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-xs shadow-sm leading-relaxed",
                  m.role === 'assistant' ? "bg-white border text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 mr-auto">
                <div className="w-7 h-7 rounded-lg bg-slate-950 border border-primary flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
                <div className="p-3 bg-white border rounded-2xl rounded-tl-none text-[10px] italic text-muted-foreground animate-pulse">
                  Genee is typing...
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-3 border-t bg-white shrink-0">
            <div className="flex w-full gap-2 bg-slate-100 p-1 rounded-full">
              <Input 
                placeholder="Ask about this product..." 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="bg-transparent border-none focus-visible:ring-0 text-xs h-10"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-full h-10 w-10 bg-slate-950">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
