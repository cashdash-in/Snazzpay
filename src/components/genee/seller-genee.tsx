
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Star, X, Send, User, Loader2, TrendingUp, GripHorizontal, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSellerGenee } from '@/ai/flows/seller-genee-flow';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';

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
    { role: 'assistant', content: "Hii! I'm your ASK.ME Star Girl! ✨ Ready to blast your sales to the moon? Let's dominate Amazon and Myntra together! 🚀" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [position, setPosition] = useState({ x: 32, y: 32 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const moveDistance = useRef(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isOpen) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    moveDistance.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    moveDistance.current += Math.abs(dx) + Math.abs(dy);
    
    setPosition({
      x: initialPos.current.x - dx,
      y: initialPos.current.y - dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (moveDistance.current > 5) {
      e.preventDefault();
      return;
    }
    setIsOpen(true);
  };

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
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! My star-power dipped for a second. Try again? ✨" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed z-[100] transition-shadow duration-200"
      style={{ 
        bottom: `${position.y}px`, 
        right: `${position.x}px`,
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {!isOpen ? (
        <div className={cn(
          "relative group transition-transform flex flex-col items-center",
          isDragging ? "scale-110 cursor-grabbing" : "cursor-grab animate-bounce-slow"
        )}>
            {!isDragging && (
                <div className="mb-4 bg-white shadow-2xl rounded-full px-6 py-2.5 border-4 border-primary animate-genee-flash pointer-events-none select-none flex items-center gap-2">
                   <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                   <span className="text-[14px] font-black uppercase italic tracking-tighter text-primary">ASK ME GENEE</span>
                </div>
            )}

            <div className="relative">
                <div className="absolute -inset-16 bg-purple-500/40 rounded-full blur-3xl animate-genee-flash"></div>
                
                <Button 
                    className="h-28 w-28 rounded-full shadow-[0_0_60px_rgba(139,92,246,0.6)] bg-slate-950 border-4 border-primary p-0 overflow-hidden relative group-hover:shadow-[0_0_90px_rgba(139,92,246,0.9)]"
                    onClick={handleTriggerClick}
                >
                    <Image 
                        src={placeholders.geneeHologram.src} 
                        alt="Star Girl" 
                        fill 
                        className="object-cover mix-blend-screen brightness-150 pointer-events-none animate-pulse"
                        unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent pointer-events-none"></div>
                    <Star className="absolute top-4 right-4 h-6 w-6 text-yellow-400 fill-yellow-400 animate-spin-slow pointer-events-none" />
                    <GripHorizontal className="absolute bottom-2 left-1/2 -translate-x-1/2 h-4 w-4 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
            </div>
        </div>
      ) : (
        <Card className="w-[400px] sm:w-[480px] h-[650px] flex flex-col shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] border-none animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="p-8 bg-slate-950 text-white border-b border-white/10 shrink-0 relative">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(139,92,246,0.6)] bg-black animate-genee-flash">
                     <Image 
                        src={placeholders.geneeAvatar.src} 
                        alt="Star Girl" 
                        fill 
                        className="object-cover mix-blend-screen brightness-150"
                        unoptimized
                    />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                    Star Girl <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  </CardTitle>
                  <p className="text-[11px] text-primary font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    Marketplace Wizard ✨
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="h-7 w-7" />
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex gap-4 max-w-[95%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}>
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2",
                  m.role === 'assistant' ? "bg-slate-950 border-primary shadow-lg animate-genee-flash" : "bg-primary border-primary text-white"
                )}>
                  {m.role === 'assistant' ? <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> : <User className="h-6 w-6" />}
                </div>
                <div className="space-y-4 flex-1">
                    <div className={cn(
                        "p-5 rounded-[32px] text-[13px] shadow-sm leading-relaxed whitespace-pre-wrap break-words",
                        m.role === 'assistant' ? "bg-white border-2 border-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium shadow-md shadow-primary/20"
                    )}>
                        {m.content}
                    </div>

                    {m.profitTip && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 p-6 rounded-[32px] animate-in fade-in slide-in-from-left-4 duration-500 shadow-sm">
                            <p className="text-[11px] font-black uppercase text-green-600 tracking-widest mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4"/> Profit Max Strategy ✨
                            </p>
                            <p className="text-xs font-bold text-emerald-900 italic leading-relaxed">"{m.profitTip}"</p>
                        </div>
                    )}

                    {m.nextSteps && m.nextSteps.length > 0 && (
                        <div className="space-y-4">
                             <p className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-2">Action Plan 🚀</p>
                             <div className="flex flex-col gap-3">
                                {m.nextSteps.map((step, idx) => (
                                    <div key={idx} className="bg-white border-2 border-slate-100 p-4 rounded-2xl text-[13px] font-bold flex items-center gap-4 hover:border-primary/40 transition-all hover:translate-x-2">
                                        <div className="h-6 w-6 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[12px] font-black italic">{idx + 1}</div>
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
              <div className="flex gap-4 mr-auto max-w-[85%]">
                <div className="w-10 h-10 rounded-2xl bg-slate-950 border-2 border-primary flex items-center justify-center shrink-0 shadow-lg animate-genee-flash">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
                <div className="p-5 bg-white border-2 border-slate-100 rounded-[32px] rounded-tl-none flex items-center gap-3 shadow-sm">
                  <p className="text-[13px] italic text-muted-foreground animate-pulse">Star Girl is analyzing marketplace data... ✨</p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 border-t bg-white shrink-0">
            <div className="flex w-full gap-2 bg-slate-100 p-2 rounded-[30px]">
              <Input 
                placeholder="Ask me how to sell on Myntra... ✨" 
                value={input} 
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-bold"
              />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-full h-14 w-14 shadow-2xl bg-slate-950 hover:bg-slate-900 transition-transform active:scale-95">
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
