'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, Bot, User, Loader2, TrendingUp } from 'lucide-react';
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
    <div className="fixed bottom-8 right-8 z-[100]">
      {!isOpen ? (
        <div className="relative group animate-bounce-slow">
            {/* Pulsing Hologram Auras */}
            <div className="absolute -inset-12 bg-purple-500/30 rounded-full blur-3xl animate-pulse group-hover:bg-purple-500/50 transition-all duration-1000"></div>
            <div className="absolute -inset-6 bg-indigo-500/20 rounded-full blur-2xl animate-pulse delay-700"></div>
            
            <Button 
                className="h-24 w-24 rounded-full shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-110 transition-all duration-700 bg-slate-950 border-4 border-primary p-0 overflow-hidden relative group-hover:shadow-[0_0_80px_rgba(139,92,246,0.8)]"
                onClick={() => setIsOpen(true)}
            >
                <Image 
                    src="https://picsum.photos/seed/genee-holo/300/300" 
                    alt="Genee Hologram" 
                    fill 
                    className="object-cover opacity-80 mix-blend-screen brightness-125"
                    data-ai-hint="genie hologram character"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white animate-spin-slow" />
            </Button>

            {/* Floating Label */}
            <div className="absolute -top-14 right-0 bg-white shadow-2xl rounded-2xl px-5 py-2.5 text-[11px] font-black uppercase italic tracking-tighter whitespace-nowrap animate-bounce border-2 border-primary">
                Summon Genee for Profits! ✨
            </div>
        </div>
      ) : (
        <Card className="w-[380px] sm:w-[450px] h-[600px] flex flex-col shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border-none animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="p-6 bg-slate-950 text-white border-b border-white/10 shrink-0 relative">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-black">
                     <Image 
                        src="https://picsum.photos/seed/genee-holo/200/200" 
                        alt="Genee" 
                        fill 
                        className="object-cover mix-blend-screen brightness-150"
                        data-ai-hint="genie avatar"
                    />
                </div>
                <div>
                  <CardTitle className="text-xl font-black italic tracking-tighter uppercase">ASK.ME Genee</CardTitle>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    AI Marketplace Consultant
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
                "flex gap-3 max-w-[95%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2",
                  m.role === 'assistant' ? "bg-slate-950 border-primary shadow-lg" : "bg-primary border-primary text-white"
                )}>
                  {m.role === 'assistant' ? <Sparkles className="h-5 w-5 text-white" /> : <User className="h-5 w-5" />}
                </div>
                <div className="space-y-4 flex-1">
                    <div className={cn(
                        "p-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                        m.role === 'assistant' ? "bg-white border-2 border-slate-100 rounded-tl-none text-slate-800" : "bg-primary text-white rounded-tr-none font-medium shadow-md shadow-primary/20"
                    )}>
                        {m.content}
                    </div>

                    {m.profitTip && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 p-5 rounded-3xl animate-in fade-in slide-in-from-left-4 duration-500 shadow-sm">
                            <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-2 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4"/> Genee Profit Strategy
                            </p>
                            <p className="text-xs font-bold text-emerald-900 italic leading-relaxed">"{m.profitTip}"</p>
                        </div>
                    )}

                    {m.nextSteps && m.nextSteps.length > 0 && (
                        <div className="space-y-3">
                             <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-1">Your Execution Steps</p>
                             <div className="flex flex-col gap-2">
                                {m.nextSteps.map((step, idx) => (
                                    <div key={idx} className="bg-white border-2 border-slate-100 p-3.5 rounded-2xl text-[12px] font-bold flex items-center gap-3 hover:border-primary/40 transition-all hover:translate-x-1">
                                        <div className="h-5 w-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black italic">{idx + 1}</div>
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
                <div className="w-9 h-9 rounded-xl bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0 shadow-lg">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
                <div className="p-4 bg-white border-2 border-slate-100 rounded-3xl rounded-tl-none flex items-center gap-2 shadow-sm">
                  <p className="text-xs italic text-muted-foreground animate-pulse">Genee is decoding the algorithms...</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-5 border-t bg-white shrink-0">
            <div className="flex w-full gap-2 bg-slate-100 p-1.5 rounded-[24px]">
              <Input 
                placeholder="Ask Amazon, Myntra, Profit Tips..." 
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
      )}
      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
