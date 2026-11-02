'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, Camera, Layers, Mic, Search, 
    Scan, List, Map as MapIcon, Download,
    Loader2, Sparkles, MessageSquare, Send,
    ShoppingBag, ShieldCheck, Clock
} from 'lucide-react';
import { getCollection, getDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { differenceInDays, parseISO, format } from 'date-fns';
import Image from 'next/image';

export default function SnapStockPartnerDashboard() {
    const router = useRouter();
    const [partner, setPartner] = useState<any | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');

    useEffect(() => {
        const partnerId = getCookie('snapstock_token');
        if (!partnerId) {
            router.push('/snapstock/login');
            return;
        }

        async function loadData() {
            try {
                const data = await getDocument('snapstock_partners', partnerId as string);
                setPartner(data);

                // For SaaS partners, we filter inventory by their store ID
                const allInventory = await getCollection<any>('inventory');
                setInventory(allInventory.filter(i => i.storeId === partnerId));
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [router]);

    const daysRemaining = useMemo(() => {
        if (!partner?.trialExpiresAt || partner.status !== 'Trial') return null;
        return differenceInDays(parseISO(partner.trialExpiresAt), new Date());
    }, [partner]);

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Branded SaaS Header */}
            <header className="bg-slate-900 text-white p-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{partner?.storeName || 'SnapStock AI'}</h1>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Intelligent Inventory</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     {partner?.status === 'Trial' && (
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 hidden md:flex items-center gap-2 font-black italic">
                            <Clock className="h-3 w-3" /> {daysRemaining} DAYS LEFT IN TRIAL
                        </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => router.push('/snapstock/login')} className="text-slate-400 hover:text-white uppercase font-black text-[10px]">Logout</Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* SaaS Welcome Card */}
                <Card className="rounded-[32px] border-none shadow-2xl bg-white overflow-hidden">
                    <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className="p-8 md:p-10 space-y-6 flex-1">
                            <div className="space-y-2">
                                <Badge className="bg-blue-100 text-blue-600 font-black uppercase text-[9px] mb-2 px-3 py-1">Store Verified <ShieldCheck className="h-2.5 w-2.5 ml-1" /></Badge>
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Command Center</h2>
                                <p className="text-slate-500 font-medium max-w-sm">Welcome, {partner?.ownerName}. Your AI engine is primed for {inventory.length} SKUs.</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button size="lg" className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase italic shadow-xl shadow-blue-100">
                                    <Camera className="mr-2 h-5 w-5" /> Bulk Snap Intake
                                </Button>
                                <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-bold uppercase text-xs">
                                    <Download className="mr-2 h-5 w-5" /> Master Export
                                </Button>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-8 md:p-10 w-full md:w-80 border-l flex flex-col justify-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Snap Usage</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black italic text-slate-900">{partner?.snapUsage || 0}</span>
                                    <span className="text-slate-400 font-bold mb-1">SNAPS</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[15%]"></div>
                            </div>
                            <Button variant="secondary" className="w-full h-11 rounded-xl bg-blue-50 text-blue-600 font-black uppercase italic text-[10px]">Buy More Credits</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Dashboard Grid - SaaS Version */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><Layers className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Visual Audit</h3>
                            <p className="text-xs text-slate-400 font-medium">Verify your shelves with AI.</p>
                        </div>
                        <Button className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 font-bold uppercase text-[10px] h-10 mt-2">Start Scan</Button>
                    </Card>

                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><Mic className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Voice Command</h3>
                            <p className="text-xs text-slate-400 font-medium">"Sold 2 items" or "Add stock".</p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl border-2 font-bold uppercase text-[10px] h-10 mt-2">Activate Mic</Button>
                    </Card>

                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><List className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Broadcast</h3>
                            <p className="text-xs text-slate-400 font-medium">Send P&L to WhatsApp.</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                             <Button variant="outline" className="flex-1 rounded-xl font-bold uppercase text-[9px] h-10 border-2">Morning</Button>
                             <Button variant="outline" className="flex-1 rounded-xl font-bold uppercase text-[9px] h-10 border-2">Night</Button>
                        </div>
                    </Card>
                </div>

                {/* Empty State / List */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest">Active Stock Items</h3>
                        <div className="flex bg-white rounded-full p-1 border shadow-sm">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                    </div>

                    {inventory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed rounded-[32px] gap-4 opacity-40">
                             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-slate-400" /></div>
                             <p className="font-black italic uppercase text-xs tracking-widest">No stock found. Take your first snap!</p>
                        </div>
                    ) : (
                        <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                             <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Shelf</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <span className="font-bold uppercase italic text-xs">{item.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase">{item.shelfNumber}</Badge></TableCell>
                                            <TableCell className="font-black text-lg">{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="font-bold uppercase text-[10px]">Manage</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                             </Table>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}
