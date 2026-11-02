'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Zap, Store, User, Mail, Phone, 
    ShieldCheck, Loader2, Sparkles,
    ImagePlus, ArrowRight, CheckCircle2,
    Lock, FileText, MapPin
} from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

export default function SnapStockRegistrationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [hasGst, setHasGst] = useState(true);
    
    const [formData, setFormData] = useState({
        storeName: '',
        ownerName: '',
        email: '',
        phone: '',
        address: '',
        gstNumber: '',
        password: ''
    });

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.storeName || !formData.email || !formData.password || !formData.address) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields including address." });
            return;
        }

        setIsLoading(true);
        const id = `SSP-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        try {
            const partnerData = {
                id,
                ...formData,
                logoDataUri: logoPreview,
                status: 'Trial',
                snapUsage: 0,
                revenueGenerated: 0,
                joinedAt: new Date().toISOString(),
                trialExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            };

            await saveDocument('snapstock_partners', partnerData, id);
            
            toast({ 
                title: "Welcome to SnapStock AI!", 
                description: "Your 10-day free trial has started. Let's set up your inventory." 
            });
            
            router.push('/snapstock/dashboard');
        } catch (error) {
            toast({ variant: 'destructive', title: "Registration Failed" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 py-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-2xl relative z-10 space-y-8">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-3 bg-blue-600/20 px-6 py-2 rounded-full border border-blue-500/30 text-blue-400 font-black uppercase italic tracking-widest text-[10px] animate-pulse">
                        <Sparkles className="h-3 w-3" /> Get 10 Days Free Trial
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
                        Join the <span className="text-blue-500">SnapStock</span> SaaS Network
                    </h1>
                    <p className="text-slate-400 text-lg max-w-lg mx-auto font-medium">
                        The ultimate AI-powered inventory system for modern retail. Register your store in 60 seconds.
                    </p>
                </div>

                <Card className="rounded-[40px] border-white/5 bg-slate-800/50 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
                    <form onSubmit={handleSignup}>
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-8 md:p-12 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2">
                                        <Store className="h-4 w-4 text-blue-500"/> Shop Profile
                                    </h3>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Store / Shop Name</Label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                required
                                                placeholder="e.g. Metro Electronics"
                                                className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9"
                                                value={formData.storeName}
                                                onChange={e => setFormData({...formData, storeName: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Shop Address</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input 
                                                required
                                                placeholder="Complete Shop Address"
                                                className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9"
                                                value={formData.address}
                                                onChange={e => setFormData({...formData, address: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Shop Logo</Label>
                                        <div className="flex gap-4 items-center">
                                            <div 
                                                className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative cursor-pointer hover:bg-white/10 transition-colors"
                                                onClick={() => document.getElementById('logo-upload')?.click()}
                                            >
                                                {logoPreview ? <Image src={logoPreview} alt="logo" fill className="object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-slate-600" />}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => document.getElementById('logo-upload')?.click()}>Upload Logo</Button>
                                                <p className="text-[9px] text-slate-500 uppercase">Optional: Appears on invoices.</p>
                                            </div>
                                            <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-white uppercase italic tracking-tighter">Business GST Registered?</Label>
                                            <Switch checked={hasGst} onCheckedChange={setHasGst} />
                                        </div>
                                        {hasGst && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative">
                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                    <Input 
                                                        placeholder="Enter GST Number"
                                                        className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9"
                                                        value={formData.gstNumber}
                                                        onChange={e => setFormData({...formData, gstNumber: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-8 md:p-12 space-y-6 border-l border-white/5">
                                <div className="space-y-4">
                                    <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2">
                                        <User className="h-4 w-4 text-indigo-400"/> Admin Login
                                    </h3>
                                    
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Owner Name</Label>
                                        <Input 
                                            required
                                            className="h-12 bg-white/5 border-white/10 rounded-2xl text-white"
                                            value={formData.ownerName}
                                            onChange={e => setFormData({...formData, ownerName: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email / Username</Label>
                                        <Input 
                                            required
                                            type="email"
                                            className="h-12 bg-white/5 border-white/10 rounded-2xl text-white"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">WhatsApp Mobile</Label>
                                        <Input 
                                            required
                                            type="tel"
                                            className="h-12 bg-white/5 border-white/10 rounded-2xl text-white"
                                            value={formData.phone}
                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Secure Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                required
                                                type="password"
                                                className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9"
                                                value={formData.password}
                                                onChange={e => setFormData({...formData, password: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <CardFooter className="p-8 bg-slate-900/50 flex flex-col gap-4">
                            <Button type="submit" className="w-full h-16 text-xl font-black uppercase italic rounded-3xl bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/20" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                Start My SnapStock Trial
                            </Button>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
                                By registering, you agree to the SnapStock SaaS License Agreement.
                            </p>
                        </CardFooter>
                    </form>
                </Card>

                <div className="text-center">
                    <p className="text-slate-400 text-sm">
                        Already have a license? <Link href="/snapstock/login" className="text-blue-500 font-bold hover:underline">Log in to Shop Portal</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
