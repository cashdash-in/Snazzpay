
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, Camera, Layers, Mic, Search, 
    Scan, List, Map as MapIcon, Download,
    Loader2, Sparkles, MessageSquare, Send,
    ShoppingBag, ShieldCheck, Clock, X, Plus, Minus,
    FileSpreadsheet, Trash2
} from 'lucide-react';
import { getCollection, saveDocument, getDocument, deleteDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { differenceInDays, parseISO, format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { detectItemsInPhoto, parseInventoryCommand } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const MAX_IMAGE_SIZE_PX = 800;

export default function SnapStockPartnerDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const [partner, setPartner] = useState<any | null>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Intake States
    const [detectedIntakeItems, setDetectedIntakeItems] = useState<any[]>([]);

    const partnerId = getCookie('snapstock_token') as string;

    const loadData = useCallback(async () => {
        if (!partnerId) {
            router.push('/snapstock/login');
            return;
        }

        try {
            const data = await getDocument('snapstock_partners', partnerId);
            setPartner(data);

            const allInventory = await getCollection<any>('inventory');
            // Filter by storeId for SaaS multi-tenancy
            const storeInventory = allInventory.filter(i => i.storeId === partnerId);
            setInventory(storeInventory.sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [partnerId, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new (window as any).Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) { if (width > MAX_IMAGE_SIZE_PX) { height *= MAX_IMAGE_SIZE_PX / width; width = MAX_IMAGE_SIZE_PX; } }
                    else { if (height > MAX_IMAGE_SIZE_PX) { width *= MAX_IMAGE_SIZE_PX / height; height = MAX_IMAGE_SIZE_PX; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const cropImage = (base64: string, box: number[]): Promise<string> => {
        return new Promise((resolve) => {
            const img = new (window as any).Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const [ymin, xmin, ymax, xmax] = box;
                const left = (xmin / 1000) * img.width;
                const top = (ymin / 1000) * img.height;
                const width = ((xmax - xmin) / 1000) * img.width;
                const height = ((ymax - ymin) / 1000) * img.height;
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, left, top, width, height, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = base64;
        });
    };

    const handleBulkIntakeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            
            if (!detections || detections.length === 0) {
                toast({ variant: 'destructive', title: "No Items Detected" });
            } else {
                const items = [];
                for (const d of detections) {
                    let cropped = uri;
                    if (d.box_2d) {
                        cropped = await cropImage(uri, d.box_2d);
                    }
                    items.push({
                        id: uuidv4().substring(0, 8).toUpperCase(),
                        name: d.productName,
                        qty: d.count,
                        mrp: 0,
                        cost: 0,
                        category: d.category,
                        imageDataUri: cropped
                    });
                }
                setDetectedIntakeItems(items);
                toast({ title: "SnapStock Segregation Ready!" });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "AI Analysis Error" });
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    const commitIntake = async () => {
        setIsAnalyzing(true);
        try {
            const now = new Date().toISOString();
            for (const item of detectedIntakeItems) {
                const newItem = {
                    ...item,
                    storeId: partnerId,
                    quantity: item.qty,
                    wholesalePrice: item.cost,
                    mrp: item.mrp,
                    shelfNumber: 'NEW',
                    lastUpdated: now,
                    addedDate: now
                };
                await saveDocument('inventory', newItem, item.id);
            }
            toast({ title: "Inventory Synced!" });
            setDetectedIntakeItems([]);
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: "Sync Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleBroadcastReport = (type: 'morning' | 'night') => {
        const totalValue = inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0);
        const lowStock = inventory.filter(i => i.quantity < 5);
        
        let message = `📦 *SNAPSTOCK REPORT: ${type.toUpperCase()}*\n`;
        message += `Store: ${partner?.storeName}\n\n`;
        
        if (type === 'morning') {
            message += `🌞 *Morning Readiness*\n- Low Stock: ${lowStock.length} SKUs\n- Store Value: ₹${totalValue.toLocaleString()}`;
        } else {
            message += `🌙 *Closing Summary*\n- Total SKUs: ${inventory.length}\n- Closing Value: ₹${totalValue.toLocaleString()}`;
        }
        
        const ws = XLSX.utils.json_to_sheet(inventory.map(i => ({ Product: i.name, Qty: i.quantity, MRP: i.mrp })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock");
        XLSX.writeFile(wb, `${type.toUpperCase()}_Report_${partner?.storeName}.xlsx`);

        window.open(`https://wa.me/919920320790?text=${encodeURIComponent(message)}`, '_blank');
        toast({ title: "Report Sent & Downloaded" });
    };

    const handleExportFullInventory = () => {
        const data = inventory.map(i => ({
            'ID': i.id,
            'Name': i.name,
            'Qty': i.quantity,
            'MRP': i.mrp,
            'Shelf': i.shelfNumber,
            'Category': i.category
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MasterStock");
        XLSX.writeFile(wb, `SnapStock_Master_${partner?.storeName}.xlsx`);
        toast({ title: "Excel Downloaded" });
    };

    const handleVoiceCommand = () => {
        const sr = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!sr) {
            toast({ variant: 'destructive', title: "Not Supported", description: "Voice recognition is not available in this browser." });
            return;
        }
        const recognition = new sr();
        recognition.onstart = () => toast({ title: "Listening...", description: "Speak your command now." });
        recognition.onresult = async (e: any) => {
            const transcript = e.results[0][0].transcript;
            setIsAnalyzing(true);
            try {
                const result = await parseInventoryCommand(transcript);
                toast({ title: "AI Understood!", description: result.summary });
                // In a real SaaS app, we would process 'result.items' here to update stock automatically
            } catch (error) {
                toast({ variant: 'destructive', title: "Parse Error" });
            } finally {
                setIsAnalyzing(false);
            }
        };
        recognition.start();
    };

    const updateItemQty = async (id: string, delta: number) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        const newQty = Math.max(0, item.quantity + delta);
        await saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: new Date().toISOString() }, id);
        setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    };

    const filteredInventory = inventory.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.shelfNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const daysRemaining = useMemo(() => {
        if (!partner?.trialExpiresAt || partner.status !== 'Trial') return null;
        return differenceInDays(parseISO(partner.trialExpiresAt), new Date());
    }, [partner]);

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-900 text-white p-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{partner?.storeName || 'SnapStock AI'}</h1>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">SaaS Partner Portal</p>
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

            <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32 md:pb-8">
                {/* Command Center */}
                <Card className="rounded-[32px] border-none shadow-2xl bg-white overflow-hidden">
                    <CardContent className="p-0 flex flex-col md:flex-row">
                        <div className="p-8 md:p-10 space-y-6 flex-1">
                            <div className="space-y-2">
                                <Badge className="bg-blue-100 text-blue-600 font-black uppercase text-[9px] mb-2 px-3 py-1">Store Verified <ShieldCheck className="h-2.5 w-2.5 ml-1" /></Badge>
                                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Command Center</h2>
                                <p className="text-slate-500 font-medium max-w-sm">Welcome, {partner?.ownerName}. Your AI engine is primed for {inventory.length} active SKUs.</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <Button size="lg" className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase italic shadow-xl shadow-blue-100" onClick={() => document.getElementById('snap-intake-input')?.click()} disabled={isAnalyzing}>
                                    {isAnalyzing ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Camera className="mr-2 h-5 w-5" />} Bulk Snap Intake
                                </Button>
                                <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-bold uppercase text-xs" onClick={handleExportFullInventory}>
                                    <Download className="mr-2 h-5 w-5" /> Master Export
                                </Button>
                                <input type="file" id="snap-intake-input" accept="image/*" capture="environment" className="hidden" onChange={handleBulkIntakeCapture} />
                            </div>
                        </div>
                        <div className="bg-slate-50 p-8 md:p-10 w-full md:w-80 border-l flex flex-col justify-center gap-6 text-center md:text-left">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Snap Usage</p>
                                <div className="flex items-end gap-2 justify-center md:justify-start">
                                    <span className="text-4xl font-black italic text-slate-900">{partner?.snapUsage || 0}</span>
                                    <span className="text-slate-400 font-bold mb-1">SNAPS</span>
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[10%]"></div>
                            </div>
                            <Button variant="secondary" className="w-full h-11 rounded-xl bg-blue-50 text-blue-600 font-black uppercase italic text-[10px]">Buy More Credits</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Segregation Confirmation */}
                {detectedIntakeItems.length > 0 && (
                    <Card className="border-2 border-blue-600 bg-blue-50/10 rounded-[32px] animate-in fade-in slide-in-from-top-4">
                        <CardHeader><CardTitle className="text-lg font-black uppercase italic flex items-center gap-2"><Sparkles className="text-blue-600"/> Confirm SnapStock Segregation</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {detectedIntakeItems.map((item, idx) => (
                                    <Card key={idx} className="p-4 bg-white rounded-2xl border-none shadow-sm flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-slate-50 shrink-0"><Image src={item.imageDataUri} fill alt="p" className="object-contain" unoptimized /></div>
                                            <div className="flex-1 min-w-0">
                                                <Input value={item.name} className="h-8 text-xs font-black uppercase italic p-0 bg-transparent border-none" onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? {...it, name: e.target.value} : it))} />
                                                <Badge variant="outline" className="text-[8px] mt-1">NEW SKU</Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-300" onClick={() => setDetectedIntakeItems(prev => prev.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">Qty</Label><Input type="number" value={item.qty} className="h-8 text-xs font-bold" onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? {...it, qty: Number(e.target.value)} : it))} /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">Cost</Label><Input type="number" value={item.cost} className="h-8 text-xs font-bold" onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? {...it, cost: Number(e.target.value)} : it))} /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">MRP</Label><Input type="number" value={item.mrp} className="h-8 text-xs font-bold text-blue-600" onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? {...it, mrp: Number(e.target.value)} : it))} /></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="gap-3">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setDetectedIntakeItems([])}>Discard</Button>
                            <Button className="flex-2 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black uppercase italic" onClick={commitIntake} disabled={isAnalyzing}>Sync to Stock</Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><Layers className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Visual Audit</h3>
                            <p className="text-xs text-slate-400 font-medium">Verify your shelves with AI.</p>
                        </div>
                        <Button className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 font-bold uppercase text-[10px] h-10 mt-2" onClick={() => document.getElementById('audit-input')?.click()} disabled={isAnalyzing}>
                             {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : "Start Scan"}
                        </Button>
                        <input type="file" id="audit-input" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if(!file) return;
                            setIsAnalyzing(true);
                            try {
                                const uri = await resizeImage(file);
                                const detections = await detectItemsInPhoto(uri, 'audit');
                                toast({ title: "Shelf Scanned", description: `${detections.length} articles verified by AI.` });
                            } catch (error) { toast({ variant: 'destructive', title: "Scan Failed" }); }
                            finally { setIsAnalyzing(false); e.target.value = ''; }
                        }} />
                    </Card>

                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><Mic className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Voice Command</h3>
                            <p className="text-xs text-slate-400 font-medium">"Sold 2 items" or "Add stock".</p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl border-2 font-bold uppercase text-[10px] h-10 mt-2" onClick={handleVoiceCommand}>Activate Mic</Button>
                    </Card>

                    <Card className="rounded-[28px] shadow-sm border-none bg-white p-6 flex flex-col gap-4 group hover:shadow-xl transition-all">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit group-hover:scale-110 transition-transform"><List className="h-6 w-6" /></div>
                        <div>
                            <h3 className="font-black italic uppercase text-lg text-slate-800">Broadcast</h3>
                            <p className="text-xs text-slate-400 font-medium">Send P&L to WhatsApp.</p>
                        </div>
                        <div className="flex gap-2 mt-2">
                             <Button variant="outline" className="flex-1 rounded-xl font-bold uppercase text-[9px] h-10 border-2" onClick={() => handleBroadcastReport('morning')}>Morning</Button>
                             <Button variant="outline" className="flex-1 rounded-xl font-bold uppercase text-[9px] h-10 border-2" onClick={() => handleBroadcastReport('night')}>Night</Button>
                        </div>
                    </Card>
                </div>

                {/* Stock List */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search inventory..." className="pl-9 h-11 rounded-xl bg-white shadow-sm border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex bg-white rounded-full p-1 border shadow-sm self-end">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                    </div>

                    {inventory.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed rounded-[40px] gap-4 opacity-40">
                             <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><ShoppingBag className="h-8 w-8 text-slate-400" /></div>
                             <p className="font-black italic uppercase text-xs tracking-widest text-slate-900">No stock found. Take your first snap!</p>
                        </div>
                    ) : (
                        <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                             <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="pl-8">Product</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Current Stock</TableHead>
                                        <TableHead className="text-right pr-8">Manage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border bg-slate-50 shadow-sm"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div>
                                                        <p className="font-black uppercase italic text-sm text-slate-800">{item.name}</p>
                                                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">₹{item.mrp}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase rounded-lg px-2">{item.shelfNumber}</Badge></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => updateItemQty(item.id, -1)}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-xl", item.quantity < 5 ? "text-red-500" : "text-slate-700")}>{item.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500" onClick={() => updateItemQty(item.id, 1)}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                 <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={async () => {
                                                     if(confirm("Delete this SKU?")) {
                                                         await deleteDocument('inventory', item.id);
                                                         setInventory(prev => prev.filter(i => i.id !== item.id));
                                                         toast({ title: "SKU Removed" });
                                                     }
                                                 }}><Trash2 className="h-4 w-4" /></Button>
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
