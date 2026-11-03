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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { addDays, addYears } from 'date-fns';

type PlanType = 'trial' | 'monthly' | 'annual';

const plans = [
    {
        id: 'trial' as PlanType,
        name: '5-Day Fast Trial',
        price: 'FREE',
        duration: 5,
        features: ['Full AI Access', 'Inventory Mapping', '50 Free Snaps'],
        color: 'bg-slate-100 border-slate-200 text-slate-800'
    },
    {
        id: 'monthly' as PlanType,
        name: 'Standard Pro',
        price: '₹599',
        duration: 30,
        features: ['Bulk Bill Intake', 'Daily P&L Report', '500 Snaps/mo'],
        color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
        id: 'annual' as PlanType,
        name: 'Annual Elite',
        price: '₹4,999',
        duration: 365,
        features: ['Priority AI Processing', 'Unlimited Inventory', '6000 Snaps/year'],
        color: 'bg-indigo-600 border-indigo-400 text-white'
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
                title: "Welcome to Ziptally!", 
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
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 py-20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-4xl relative z-10 space-y-8">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mx-auto shadow-2xl rotate-3 mb-6">
                        <Zap className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
                        Smarter Retail with <span className="text-blue-500">Ziptally AI</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-lg mx-auto font-medium">
                        The ultimate AI-powered inventory system. Register your store and start tracking in seconds.
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-8">
                    {/* Step 1: Profile */}
                    <Card className="rounded-[40px] border-white/5 bg-slate-800/50 backdrop-blur-2xl shadow-2xl overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-8 md:p-12 space-y-6">
                                <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2">
                                    <Store className="h-4 w-4 text-blue-500"/> Shop Identity
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Store Name</Label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input required placeholder="e.g. Metro Electronics" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Address</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                            <Input required placeholder="Complete Shop Address" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                                            {logoPreview ? <Image src={logoPreview} alt="logo" fill className="object-contain p-1" /> : <ImagePlus className="h-6 w-6 text-slate-600" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => document.getElementById('logo-upload')?.click()}>Upload Shop Logo</Button>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Appears on invoices</p>
                                        </div>
                                        <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-8 md:p-12 space-y-6 border-l border-white/5">
                                <h3 className="text-white font-black italic uppercase tracking-widest text-sm flex items-center gap-2">
                                    <User className="h-4 w-4 text-indigo-400"/> Admin Login
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Owner Name</Label>
                                        <Input required className="h-12 bg-white/5 border-white/10 rounded-2xl text-white" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email / Username</Label>
                                        <Input required type="email" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input required type="password" placeholder="Min 6 characters" className="h-12 bg-white/5 border-white/10 rounded-2xl text-white pl-9" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Step 2: Pricing */}
                    <div className="space-y-4">
                        <h3 className="text-white font-black italic uppercase tracking-widest text-center">Select Your Success Plan</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {plans.map((plan) => (
                                <Card 
                                    key={plan.id} 
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={cn(
                                        "rounded-3xl border-2 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95 flex flex-col",
                                        selectedPlan === plan.id ? "ring-4 ring-blue-500/50 scale-[1.02] border-blue-500" : "border-white/5 bg-slate-800/30 opacity-70",
                                        plan.id === 'annual' && selectedPlan === 'annual' ? "bg-indigo-600 border-indigo-400 text-white" : ""
                                    )}
                                >
                                    <CardHeader className="text-center p-6">
                                        {plan.id === 'trial' && <Sparkles className="h-6 w-6 mx-auto mb-2 text-blue-400" />}
                                        {plan.id === 'annual' && <Star className="h-6 w-6 mx-auto mb-2 text-yellow-400 fill-current" />}
                                        <CardTitle className="text-sm font-black uppercase italic tracking-widest">{plan.name}</CardTitle>
                                        <p className="text-4xl font-black italic my-2">{plan.price}</p>
                                    </CardHeader>
                                    <CardContent className="flex-1 p-6 pt-0">
                                        <ul className="space-y-2">
                                            {plan.features.map(f => (
                                                <li key={f} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                                    <CheckCircle2 className="h-3 w-3 shrink-0" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Step 3: Terms & Finalize */}
                    <Card className="rounded-[32px] border-white/5 bg-slate-800/80 p-8 shadow-2xl">
                        <CardContent className="space-y-6 p-0">
                            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
                                <h4 className="text-white font-black italic uppercase text-xs mb-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500"/> Ziptally Usage Terms
                                </h4>
                                <div className="space-y-3 text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-wider">
                                    <p>• Data Ownership: All inventory data uploaded remains your private property.</p>
                                    <p>• AI Usage: "Snaps" are debited for Bulk Intake, Bill OCR, and Voice Commands.</p>
                                    <p>• Privacy: We do not store physical bill photos longer than 24 hours.</p>
                                    <p>• Billing: Subscriptions are prepaid and non-refundable.</p>
                                </div>
                                <div className="flex items-center space-x-3 mt-6 p-3 bg-white/5 rounded-xl border border-white/10">
                                    <Checkbox id="usage-terms" checked={agreedToTerms} onCheckedChange={(val) => setAgreedToTerms(val as boolean)} className="border-white/50" />
                                    <Label htmlFor="usage-terms" className="text-[10px] font-black uppercase italic text-white cursor-pointer">
                                        I Agree to the SaaS License & Usage Policy
                                    </Label>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-16 text-xl font-black uppercase italic rounded-3xl bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/20" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                Start My Ziptally Journey
                            </Button>
                        </CardContent>
                        <CardFooter className="justify-center pt-6">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                <ShieldCheck className="h-3 w-3" /> Powered by Ziptally Star Intelligence
                            </div>
                        </CardFooter>
                    </Card>
                </form>

                <div className="text-center">
                    <p className="text-slate-400 text-sm">
                        Existing Partner? <Link href="/ziptally/login" className="text-blue-500 font-bold hover:underline">Log in here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
