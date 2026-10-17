'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, Bot, User, Loader2, Zap, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSellerGenee } from '@/ai/flows/seller-genee-flow';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  advice?: string;
  nextSteps?: string[];
  profitTip?: string;
}

export function SellerGenee() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am your ASK.ME Genee. I'm here to help you conquer marketplaces like Amazon and Myntra while keeping your profits high. What shall we build today?" }
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
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        content: [{ text: m.content }]
      }));

      const result = await askSellerGenee({
        query: userMsg,
        history: history
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.advice,
        nextSteps: result.nextSteps,
        profitTip: result.profitTip
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "My crystal ball is a bit cloudy. Let's try again in a moment!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!isOpen ? (
        <div className="relative group">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse group-hover:bg-primary/40 transition-all"></div>
            <Button 
            className="h-20 w-20 rounded-full shadow-2xl hover:scale-110 transition-all duration-500 bg-slate-900 border-4 border-primary p-0 overflow-hidden relative"
            onClick={() => setIsOpen(true)}
            >
                <Image 
                    src="https://picsum.photos/seed/genee/200/200" 
                    alt="Genee Hologram" 
                    fill 
                    className="object-cover opacity-80 mix-blend-screen"
                    data-ai-hint="genie hologram"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
                <Sparkles className="absolute top-2 right-2 h-4 w-4 text-white animate-spin-slow" />
            </Button>
            <div className="absolute -top-12 right-0 bg-white shadow-xl rounded-2xl px-4 py-2 text-[10px] font-black uppercase italic tracking-tighter whitespace-nowrap animate-bounce border-2 border-primary">
                Ask Genee for Profit!
            </div>
        </div>
      ) : (
        <Card className="w-[380px] sm:w-[450px] h-[600px] flex flex-col shadow-2xl border-none animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 rounded-[32px] overflow-hidden">
          <CardHeader className="p-6 bg-slate-900 text-white border-b border-white/10 shrink-0 relative">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                     <Image 
                        src="https://picsum.photos/seed/genee/200/200" 
                        alt="Genee" 
                        fill 
                        className="object-cover mix-blend-screen"
                        data-ai-hint="genie avatar"
                    />
                </div>
                <div>
                  <CardTitle className="text-lg font-black italic tracking-tighter uppercase">ASK.ME Genee</CardTitle>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Your Marketplace Consultant
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex gap-3 max-w-[90%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2",
                  m.role === 'assistant' ? "bg-slate-900 border-primary shadow-lg" : "bg-primary border-primary text-white"
                )}>
                  {m.role === 'assistant' ? <Sparkles className="h-4 w-4 text-white" /> : <User className="h-4 w-4" />}
                </div>
                <div className="space-y-3 flex-1">
                    <div className={cn(
                        "p-4 rounded-2xl text-sm shadow-sm leading-relaxed",
                        m.role === 'assistant' ? "bg-white border-2 border-slate-100 rounded-tl-none text-slate-800" : "bg-primary text-white rounded-tr-none font-medium"
                    )}>
                        {m.content}
                    </div>

                    {m.profitTip && (
                        <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                            <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3"/> Genee Profit Tip
                            </p>
                            <p className="text-xs font-bold text-green-900 italic">"{m.profitTip}"</p>
                        </div>
                    )}

                    {m.nextSteps && m.nextSteps.length > 0 && (
                        <div className="space-y-2">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Your Action Items</p>
                             <div className="flex flex-col gap-1.5">
                                {m.nextSteps.map((step, idx) => (
                                    <div key={idx} className="bg-white border p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2 hover:border-primary/50 transition-colors">
                                        <div className="h-4 w-4 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px]">{idx + 1}</div>
                                        {step}
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 mr-auto max-w-[80%]">
                <div className="w-8 h-8 rounded-lg bg-slate-900 border-2 border-primary flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
                <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <p className="text-xs italic text-muted-foreground animate-pulse">Genee is consulting the scrolls...</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-4 border-t bg-white shrink-0">
            <div className="flex w-full gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <Input 
                placeholder="Ask Genee about Amazon, Social Ads..." 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-medium"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-xl h-11 w-11 shadow-lg bg-slate-900 hover:bg-slate-800">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
