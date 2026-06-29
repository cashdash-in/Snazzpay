
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { askSiteAssistant } from '@/ai/flows/site-chatbot-flow';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SiteChatbotProps {
    siteId: string;
    welcomeMessage: string;
    themeColor: string;
    persona: string;
    storeName: string;
}

export function SiteChatbot({ siteId, welcomeMessage, themeColor, persona, storeName }: SiteChatbotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: welcomeMessage }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await askSiteAssistant({
                siteId,
                storeName,
                persona,
                query: userMessage,
                history: messages
            });
            
            setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting right now. Please try again later!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen ? (
                <Button 
                    className="h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300" 
                    style={{ backgroundColor: themeColor }}
                    onClick={() => setIsOpen(true)}
                >
                    <MessageSquare className="h-8 w-8" />
                </Button>
            ) : (
                <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl border-none animate-in slide-in-from-bottom-8 duration-300">
                    <CardHeader className="p-4 border-b rounded-t-lg text-white" style={{ backgroundColor: themeColor }}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot className="h-6 w-6" />
                                <div>
                                    <CardTitle className="text-sm font-bold">Assistant</CardTitle>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                        <span className="text-[10px] opacity-80 uppercase tracking-tighter">Online</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white" onClick={() => setIsOpen(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={cn(
                                "flex gap-2 max-w-[85%]",
                                m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                                    m.role === 'assistant' ? "bg-slate-50" : "bg-primary text-white"
                                )} style={m.role === 'user' ? { backgroundColor: themeColor } : {}}>
                                    {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    m.role === 'assistant' ? "bg-slate-100 rounded-tl-none" : "bg-white border rounded-tr-none"
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 mr-auto max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="p-3 bg-slate-100 rounded-2xl rounded-tl-none flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-3 border-t bg-slate-50 rounded-b-lg">
                        <div className="flex w-full gap-2">
                            <Input 
                                placeholder="Ask about our products..." 
                                value={input} 
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                className="bg-white"
                            />
                            <Button size="icon" onClick={handleSend} disabled={isLoading} style={{ backgroundColor: themeColor }}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

    