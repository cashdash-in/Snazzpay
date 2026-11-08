import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Zap, CheckCircle2, ShieldCheck, 
    ArrowRight, Sparkles, BarChart3, 
    Camera, Layers, Mic, FileUp, 
    Smartphone, Globe, TrendingUp,
    Clock, Star, Package, X
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const features = [
    {
        icon: Layers,
        title: "AI Bulk Snap",
        description: "Intake hundreds of products in seconds. Snap a group photo, and ZipTally identifies every item and sets your stock levels instantly.",
        color: "text-emerald-600 bg-emerald-50"
    },
    {
        icon: FileUp,
        title: "Bill AI Sync",
        description: "Zero manual data entry. Upload your supplier bill and a photo of the shipment; our AI matches prices and items automatically.",
        color: "text-blue-600 bg-blue-50"
    },
    {
        icon: Smartphone,
        title: "Scan to Sell",
        description: "Turn any mobile phone into a high-speed retail scanner. Generate invoices and update stock in real-time as you sell.",
        color: "text-indigo-600 bg-indigo-50"
    },
    {
        icon: ShieldCheck,
        title: "Visual Shelf Audit",
        description: "Identify discrepancies between system records and physical shelves by simply waving your camera over your products.",
        color: "text-purple-600 bg-purple-50"
    }
];

const plans = [
    {
        name: "5-Day Trial",
        price: "FREE",
        description: "Perfect for testing the AI power.",
        features: ["50 AI Snaps", "Basic Inventory", "Daily Reports"],
        cta: "Start Free Trial",
        variant: "outline" as const
    },
    {
        name: "Standard Pro",
        price: "₹599",
        period: "/month",
        description: "The complete toolkit for growing shops.",
        features: ["500 AI Snaps", "Bulk Bill Intake", "Advanced P&L", "Priority AI"],
        cta: "Go Pro Now",
        variant: "default" as const,
        popular: true
    },
    {
        name: "Annual Elite",
        price: "₹4,999",
        period: "/year",
        description: "Maximum power for high-volume retailers.",
        features: ["6000 AI Snaps", "Unlimited SKUs", "Multi-Staff Access", "Custom Reports"],
        cta: "Get Elite Access",
        variant: "default" as const
    }
];

export default function ZiptallyLandingPage() {
    return (
        <div className="bg-white min-h-screen text-slate-900 font-sans selection:bg-emerald-100">
            {/* Nav */}
            <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                            <Zap className="h-5 w-5 text-white fill-current" />
                        </div>
                        <span className="text-xl font-black italic tracking-tighter uppercase text-slate-900">ZipTally AI</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/ziptally/login">
                            <Button variant="ghost" className="font-bold text-xs uppercase tracking-widest">Login</Button>
                        </Link>
                        <Link href="/ziptally/register">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 font-black text-xs uppercase tracking-widest px-6 rounded-full">Register</Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative pt-20 pb-32 overflow-hidden bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] italic bg-emerald-100 text-emerald-700 mb-4">
                             Smart Stock. Stronger Business.
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-950 leading-[0.85] uppercase italic">
                            Stock Zip Karo, <br/> <span className="text-emerald-600">Aage Bado!</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
                            Stop wasting hours on manual inventory. ZipTally AI uses computer vision to track your stock, manage billing, and audit your shelves instantly.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                            <Link href="/ziptally/register">
                                <Button size="lg" className="h-16 px-10 text-xl font-black uppercase italic rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-200 hover:scale-105 transition-transform">
                                    Launch My Shop <ArrowRight className="ml-2" />
                                </Button>
                            </Link>
                            <Button asChild variant="outline" size="lg" className="h-16 px-10 text-xl font-black uppercase italic rounded-2xl border-2 hover:bg-white transition-all">
                                <Link href="#features-section">Watch Demo</Link>
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Decorative Blobs */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute top-1/3 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            </section>

            {/* Problem Section */}
            <section className="py-24 bg-white border-y">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none text-slate-900">Retail is hard. <br/> <span className="text-slate-400">ZipTally makes it easy.</span></h2>
                            <div className="space-y-6">
                                {[
                                    { t: "Inventory Chaos", d: "Manual stock taking is slow and prone to errors." },
                                    { t: "Billing Bottlenecks", d: "Paper bills and slow data entry lose you customers." },
                                    { t: "Stock Leakage", d: "Items go missing without any record. We fix that." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                                            <X className="h-5 w-5 text-slate-400 group-hover:text-red-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-black uppercase italic text-sm text-slate-800">{item.t}</h4>
                                            <p className="text-sm text-slate-500 font-medium">{item.d}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-[40px] overflow-hidden shadow-2xl border-8 border-slate-50">
                            <Image src="https://picsum.photos/seed/retail-ai/800/450" fill className="object-cover" alt="Retail AI" />
                            <div className="absolute inset-0 bg-emerald-600/10"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features-section" className="py-32 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">AI-Powered Features</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Everything you need to automate your shop</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <Card key={i} className="rounded-[32px] border-none shadow-xl hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2">
                                <CardHeader>
                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:rotate-6", f.color)}>
                                        <f.icon className="h-8 w-8" />
                                    </div>
                                    <CardTitle className="text-xl font-black italic uppercase tracking-tight leading-none">{f.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-slate-900">Transparent Pricing</h2>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hidden fees. Pure performance.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto">
                        {plans.map((p, i) => (
                            <Card key={i} className={cn(
                                "rounded-[40px] p-8 flex flex-col border-2 transition-all duration-500",
                                p.popular ? "border-emerald-600 shadow-2xl scale-105 bg-emerald-50/10" : "border-slate-100 shadow-lg hover:border-emerald-200"
                            )}>
                                {p.popular && <Badge className="w-fit mb-6 bg-emerald-600 text-white font-black italic px-4">MOST POPULAR</Badge>}
                                <div className="space-y-2 mb-8">
                                    <h3 className="font-black italic uppercase text-lg text-slate-400">{p.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-6xl font-black italic tracking-tighter">{p.price}</span>
                                        {p.period && <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{p.period}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">{p.description}</p>
                                </div>
                                <div className="flex-1 space-y-4 mb-10">
                                    {p.features.map(f => (
                                        <div key={f} className="flex items-center gap-3 text-xs font-black uppercase text-slate-700">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {f}
                                        </div>
                                    ))}
                                </div>
                                <Link href="/ziptally/register" className="w-full">
                                    <Button variant={p.variant} className={cn(
                                        "w-full h-14 rounded-2xl text-lg font-black uppercase italic",
                                        p.popular && "bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200"
                                    )}>
                                        {p.cta}
                                    </Button>
                                </Link>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-slate-950 text-white overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30"></div>
                <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-12 relative z-10 text-center">
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl">
                                <Zap className="h-6 w-6 text-white fill-current" />
                            </div>
                            <span className="text-4xl font-black italic tracking-tighter uppercase">ZipTally AI</span>
                        </div>
                        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs italic">Stock Zip Karo, Aage Bado!</p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Link href="/ziptally/login" className="hover:text-emerald-400 transition-colors">Partner Login</Link>
                        <Link href="/auth/login" className="hover:text-emerald-400 transition-colors">Admin Portal</Link>
                        <Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link>
                        <Link href="/terms/seller" className="hover:text-emerald-400 transition-colors">Merchant Terms</Link>
                        <Link href="mailto:support@ziptally.ai" className="hover:text-emerald-400 transition-colors">Contact Support</Link>
                    </div>

                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Powered by ZipTally AI Global
                    </div>
                </div>
            </footer>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </span>
    );
}
