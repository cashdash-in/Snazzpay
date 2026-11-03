'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Zap, Store, User, Mail, 
    ShieldCheck, Loader2, Sparkles,
    ImagePlus, CheckCircle2,
    Lock, FileText, MapPin, 
    Clock, Calendar, Star,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveDocument } from '@/services/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';

type PlanType = 'trial' | 'monthly' | 'annual';

const plans = [
    {
        id: 'trial' as PlanType,
        name: '5-Day Fast Trial',
        price: 'FREE',
        duration: 5,
        features: ['Full AI Access', 'Inventory Mapping', '50 Free Snaps'],
        color: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 text-white'
    },
    {
        id: 'monthly' as PlanType,
        name: 'Standard Pro',
        price: '₹599',
        duration: 30,
        features: ['Bulk Bill Intake', 'Daily P&L Report', '500 Snaps/mo'],
        color: 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-400 text-white'
    },
    {
        id: 'annual' as PlanType,
        name: 'Annual Elite',
        price: '₹4,999',
        duration: 365,
        features: ['Priority AI Processing', 'Unlimited Inventory', '6000 Snaps/year'],
        color: 'bg-gradient-to-br from-amber-400 to-orange-600 border-amber-300 text-white'
    }
];

export default function ZiptallyRegistrationPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('monthly');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    
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
        
        if (!agreedToTerms) {
            toast({ variant: 'destructive', title: "Terms Required", description: "Please accept the usage terms to proceed." });
            return;
        }

        if (!formData.storeName || !formData.email || !formData.password || !formData.address) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields." });
            return;
        }

        setIsLoading(true);
        const id = `ZIP-${uuidv4().substring(0, 8).toUpperCase()}`;
        
        const planDetails = plans.find(p => p.id === selectedPlan);
        const expiryDate = addDays(new Date(), planDetails?.duration || 30).toISOString();
        
        try {
            const partnerData = {
                id,
                ...formData,
                logoDataUri: logoPreview,
                status: selectedPlan === 'trial' ? 'Trial' : 'Active',
                planType: selectedPlan,
                snapUsage: 0,
                revenueGenerated: 0,
                joinedAt: new Date().toISOString(),
                trialExpiresAt: expiryDate,
                licenseExpiry: expiryDate,
            };

            await saveDocument('snapstock_partners', partnerData, id);
            
            toast({ 
                title: "Welcome to Ziptally AI!", 
                description: `Your ${planDetails?.name} has been activated.` 
            });
            
            router.push('/ziptally/login');
        } catch (error) {
            toast({ variant: 'destructive', title: "Registration Failed" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 py-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-full max-w-5xl relative z-10 space-y-12 text-white">
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl rotate-3 mb-8">
                        <Zap className="h-12 w-12 text-white fill-current" />
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
                        Ziptally <span className="text-blue-500">AI</span>
                    </h1>
                    <p className="text-blue-400 text-lg md:text-2xl font-black uppercase tracking-[0.2em] italic">
                        Zip your Stock with AI
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-12">
                    <div className="space-y-6">
                        <h3 className="text-white font-black italic uppercase tracking-[0.2em] text-center text-sm">Select Your Success Plan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {plans.map((plan) => (
                                <Card 
                                    key={plan.id} 
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={cn(
                                        "rounded-[40px] border-4 transition-all duration-300 cursor-pointer transform hover:scale-[1.05] active:scale-95 flex flex-col overflow-hidden",
                                        plan.color,
                                        selectedPlan === plan.id ? "ring-8 ring-white/10 scale-[1.05] border-white" : "border-transparent opacity-90 brightness-90 hover:brightness-100"
                                    )}
                                >
                                    <CardHeader className="text-center p-8 space-y-2">
                                        <div className="mx-auto w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                                            {plan.id === 'trial' && <Sparkles className="h-6 w-6 text-white" />}
                                            {plan.id === 'monthly' && <Zap className="h-6 w-6 text-white" />}
                                            {plan.id === 'annual' && <Star className="h-6 w-6 text-white fill-current" />}
                                        </div>
                                        <CardTitle className="text-base font-black uppercase italic tracking-widest">{plan.name}</CardTitle>
                                        <p className="text-5xl font-black italic tracking-tighter">{plan.price}</p>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-8 pt-0">
                                        <ul className="space-y-3">
                                            {plan.features.map(f => (
                                                <li key={f} className="flex items-center gap-3 text-xs font-black uppercase tracking-wider">
                                                    <CheckCircle2 className="h-4 w-4 shrink-0" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    {selectedPlan === plan.id && (
                                        <div className="bg-white/20 py-3 text-center text-[10px] font-black uppercase tracking-widest">
                                            Currently Selected
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    </div>

                    <Card className="rounded-[40px] border-white/5 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-8 md:p-12 space-y-6">
                                <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2 border-b border-white/5 pb-4">
                                    <Store className="h-4 w-4 text-blue-500"/> Shop Identity
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-200 tracking-widest ml-1">Store Name</Label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input required placeholder="e.g. Metro Electronics" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9 font-bold" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-200 tracking-widest ml-1">Shop Address</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input required placeholder="Complete Street Address" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9 font-bold" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center pt-2">
                                        <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                                            {logoPreview ? <Image src={logoPreview} alt="logo" fill className="object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-slate-600" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => document.getElementById('logo-upload')?.click()}>Upload Shop Logo</Button>
                                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Appears on reports</p>
                                        </div>
                                        <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-8 md:p-12 space-y-6 border-l border-white/5">
                                <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2 border-b border-white/5 pb-4">
                                    <User className="h-4 w-4 text-indigo-400"/> Manager Access
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-200 tracking-widest ml-1">Owner Name</Label>
                                        <Input required className="h-12 bg-white/5 border-white/10 rounded-2xl text-white font-bold" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-200 tracking-widest ml-1">Email / Mobile</Label>
                                        <Input required className="h-12 bg-white/5 border-white/10 rounded-2xl text-white font-bold" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-200 tracking-widest ml-1">Login Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input required type="password" placeholder="Min 6 characters" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9 font-bold" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="rounded-[40px] border-white/5 bg-slate-900/80 p-8 md:p-12 shadow-2xl">
                        <CardContent className="space-y-8 p-0">
                            <div className="bg-slate-950/50 rounded-[32px] p-8 border border-white/5">
                                <h4 className="text-white font-black italic uppercase text-xs mb-6 flex items-center gap-2 tracking-widest">
                                    <FileText className="h-5 w-5 text-blue-500"/> Licensing & Usage Terms
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-300 leading-relaxed font-bold uppercase tracking-wider">
                                    <p className="flex gap-3"><span className="text-blue-500">01</span> Data remains 100% your property.</p>
                                    <p className="flex gap-3"><span className="text-blue-500">02</span> AI Snaps are non-refundable.</p>
                                    <p className="flex gap-3"><span className="text-blue-500">03</span> No long-term contracts. Cancel anytime.</p>
                                    <p className="flex gap-3"><span className="text-blue-500">04</span> Multi-user access is plan-dependent.</p>
                                </div>
                                <div className="flex items-center space-x-4 mt-10 p-5 bg-blue-600/10 rounded-[24px] border border-blue-500/30 group hover:bg-blue-600/20 transition-all cursor-pointer">
                                    <Checkbox id="usage-terms" checked={agreedToTerms} onCheckedChange={(val) => setAgreedToTerms(val as boolean)} className="h-6 w-6 border-white/50" />
                                    <Label htmlFor="usage-terms" className="text-xs font-black uppercase italic text-white cursor-pointer select-none">
                                        I Agree to the Ziptally AI SaaS License & Usage Policy
                                    </Label>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-20 text-2xl font-black uppercase italic rounded-[32px] bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/40 transform hover:scale-[1.02] transition-all" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Zap className="mr-3 h-8 w-8" />}
                                Launch My Ziptally AI
                            </Button>
                        </CardContent>
                    </Card>
                </form>

                <div className="text-center space-y-6">
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
                        Existing Partner? <Link href="/ziptally/login" className="text-blue-500 hover:text-blue-400 transition-colors">Log in to your terminal</Link>
                    </p>
                    <div className="flex items-center justify-center gap-3 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
                        <ShieldCheck className="h-4 w-4" /> Secure Licensing powered by Snazzify AI
                    </div>
                </div>
            </div>
        </div>
    );
}