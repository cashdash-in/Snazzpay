
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Star, X, Send, User, Loader2, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSellerGenee } from '@/ai/flows/seller-genee-flow';
import Image from 'next/image';
import placeholders from '@/app/lib/placeholder-images.json';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function SellerGenee() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hii! I'm Star Girl! ✨ Let's grow! 🚀" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [position, setPosition] = useState({ x: 20, y: 20 });
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
        content: result.advice
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Oops! ✨" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed z-[100]"
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
          "flex flex-col items-center gap-1",
          isDragging ? "scale-110 cursor-grabbing" : "cursor-grab"
        )}>
            {!isDragging && (
                <div className="bg-white/90 backdrop-blur shadow-xl rounded-full px-2 py-0.5 border border-primary animate-genee-flash pointer-events-none select-none flex items-center gap-1">
                   <Star className="h-2 w-2 text-yellow-400 fill-yellow-400" />
                   <span className="text-[7px] font-black uppercase italic tracking-tighter text-primary">ASK ME</span>
                </div>
            )}

            <div className="relative">
                <div className="absolute -inset-4 bg-purple-500/10 rounded-full blur-xl animate-genee-flash"></div>
                <Button 
                    className="h-10 w-10 rounded-full shadow-2xl bg-slate-950 border-2 border-primary p-0 overflow-hidden relative"
                    onClick={handleTriggerClick}
                >
                    <Image 
                        src={placeholders.geneeHologram.src} 
                        alt="Star Girl" 
                        fill 
                        className="object-cover mix-blend-screen brightness-150 pointer-events-none"
                        unoptimized
                    />
                    <GripHorizontal className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 text-white/20" />
                </Button>
            </div>
        </div>
      ) : (
        <Card className="w-[220px] h-[300px] flex flex-col shadow-2xl border-none animate-in zoom-in-95 slide-in-from-bottom-5 rounded-[24px] overflow-hidden bg-white">
          <CardHeader className="p-3 bg-slate-950 text-white border-b border-white/10 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="relative h-6 w-6 rounded-lg overflow-hidden border border-primary bg-black">
                     <Image src={placeholders.geneeAvatar.src} alt="Star Girl" fill className="object-cover mix-blend-screen brightness-150" unoptimized />
                </div>
                <CardTitle className="text-[10px] font-black uppercase tracking-tight">Star Girl</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="text-white h-5 w-5" onClick={() => setIsOpen(false)}><X className="h-3 w-3" /></Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2 max-w-[95%]", m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className={cn("p-3 rounded-[16px] text-[9px] shadow-sm leading-tight break-words", m.role === 'assistant' ? "bg-white border border-slate-100 text-slate-800 rounded-tl-none" : "bg-primary text-white rounded-tr-none font-medium")}>
                    {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 mr-auto"><div className="w-4 h-4 rounded-md bg-slate-950 border border-primary flex items-center justify-center"><Loader2 className="h-2 text-white animate-spin" /></div><div className="p-2 bg-white border border-slate-100 rounded-xl rounded-tl-none"><p className="text-[8px] italic text-muted-foreground animate-pulse">...</p></div></div>
            )}
          </CardContent>

          <CardFooter className="p-2 border-t bg-white shrink-0">
            <div className="flex w-full gap-1.5 bg-slate-100 p-1 rounded-full">
              <Input placeholder="Ask... ✨" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="bg-transparent border-none h-6 text-[9px] font-bold" />
              <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-full h-6 w-6 shadow-lg bg-slate-950 hover:bg-slate-900 shrink-0"><Send className="h-2.5 w-2.5" /></Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
