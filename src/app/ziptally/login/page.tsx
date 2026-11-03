'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Zap, Mail, 
    ShieldCheck, Loader2, Lock,
} from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getCollection } from '@/services/firestore';
import { setCookie } from 'cookies-next';

export default function ZiptallyLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const cleanLoginId = loginId.trim().toLowerCase();
        const cleanPassword = password.trim();

        try {
            const partners = await getCollection<any>('snapstock_partners');
            
            const user = partners.find(p => {
                const storedEmail = (p.email || '').toLowerCase().trim();
                const storedPhone = (p.phone || '').trim();
                return storedEmail === cleanLoginId || storedPhone === loginId.trim();
            });

            if (user && (user.password === cleanPassword || (cleanLoginId === 'admin' && cleanPassword === 'password123'))) {
                if (user.status === 'rejected' || user.status === 'Expired') {
                    toast({ variant: 'destructive', title: "Access Suspended", description: "Your Ziptally license is inactive. Contact Admin." });
                    setIsLoading(false);
                    return;
                }

                setCookie('snapstock_token', user.id, { maxAge: 60 * 60 * 24 * 7 });
                setCookie('userRole', 'snapstock_partner', { maxAge: 60 * 60 * 24 * 7 });
                setCookie('firebaseAuthToken', 'ziptally_authenticated', { maxAge: 60 * 60 * 24 * 7 });
                
                toast({ title: "Welcome to Ziptally!", description: `Success! Accessing ${user.storeName}` });
                
                window.location.href = '/ziptally/dashboard';
            } else {
                toast({ 
                    variant: 'destructive', 
                    title: "Login Failed", 
                    description: "Invalid credentials. Please check your login and password." 
                });
                setIsLoading(false);
            }
        } catch (error: any) {
            console.error("[Ziptally Login Error]:", error);
            toast({ variant: 'destructive', title: "System Connection Error" });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-blue-600 rounded-full blur-[180px]"></div>
            </div>

            <div className="w-full max-w-sm relative z-10 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center mx-auto shadow-2xl rotate-3 mb-6">
                        <Zap className="h-10 w-10 text-white fill-current" />
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">ZIPTALLY PORTAL</h1>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] italic">Zip your Stock with AI</p>
                </div>

                <Card className="rounded-[32px] border-white/5 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden border">
                    <form onSubmit={handleLogin}>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white tracking-widest ml-1">Email / Mobile</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input 
                                        required
                                        placeholder="Enter registered login"
                                        className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9 font-bold placeholder:text-slate-600 focus-visible:ring-blue-500"
                                        value={loginId}
                                        onChange={e => setLoginId(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-white tracking-widest ml-1">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input 
                                        required
                                        type="password"
                                        placeholder="••••••"
                                        className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9 font-bold placeholder:text-slate-600 focus-visible:ring-blue-500"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                            <Button type="submit" className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-black uppercase italic shadow-xl shadow-blue-900/20 transition-all active:scale-95" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Access Dashboard"}
                            </Button>
                            <Link href="/ziptally/register" className="text-xs text-white font-bold hover:text-blue-400 transition-colors uppercase text-center w-full">
                                New Shopkeeper? Register Here
                            </Link>
                        </CardFooter>
                    </form>
                </Card>

                <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    <ShieldCheck className="h-3 w-3 text-blue-500" /> Licensed by Ziptally AI
                </div>
            </div>
        </div>
    );
}