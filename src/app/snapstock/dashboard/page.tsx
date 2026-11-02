
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
    FileSpreadsheet, Trash2, DollarSign
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
    
    // Scanner State
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<any | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);
    
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

    // SCANNER LOGIC
    useEffect(() => {
        if (!isScanning) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("partner-reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText) => {
                const item = inventory.find(i => i.id === decodedText || i.name === decodedText);
                if (item) {
                    setSelectedSaleItem(item);
                    setSalePrice(item.mrp);
                    setSaleQty(1);
                    setIsScanning(false);
                    scanner.clear();
                    toast({ title: "Found: " + item.name });
                } else {
                    toast({ variant: 'destructive', title: "SKU Not Found" });
                }
            }, (err) => {});
            return () => { scanner.clear().catch(() => {}); };
        }, 100);
        return () => clearTimeout(timer);
    }, [isScanning, inventory, toast]);

    const handleTextCommand = async (command: string) => {
        if (!command.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await parseInventoryCommand(command);
            toast({ title: "AI Voice Summary", description: result.summary });
            // In a real SaaS, we process result.items to update store stock
            loadData();
        } catch (e) { toast({ variant: 'destructive', title: "Voice Parse Failed" }); }
        finally { setIsAnalyzing(false); }
    };

    const handleVoiceMic = () => {
        const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!sr) {
            toast({ variant: 'destructive', title: "Browser not supported" });
            return;
        }
        const recognition = new sr();
        recognition.onstart = () => toast({ title: "Listening..." });
        recognition.onresult = (e: any) => handleTextCommand(e.results[0][0].transcript);
        recognition.start();
    };

    const updateItemQty = async (id: string, delta: number) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        const newQty = Math.max(0, item.quantity + delta);
        await saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: new Date().toISOString() }, id);
        setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));
        toast({ title: "Stock Sync Complete" });
    };

    const handleBroadcastReport = (type: 'morning' | 'night') => {
        const data = inventory.map(i => ({ Product: i.name, Qty: i.quantity, MRP: i.mrp }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${partner?.storeName}_${type}_Stock.xlsx`);
        window.open(`https://wa.me/919920320790?text=${encodeURIComponent(`📦 *SNAPSTOCK ${type.toUpperCase()}*\nStore: ${partner?.storeName}\nSKUs: ${inventory.length}`)}`, '_blank');
    };

    const filteredInventory = inventory.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 h-10 w-10" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-900 text-white p-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Zap className="h-6 w-6 text-white" /></div>
                    <div><h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{partner?.storeName || 'SnapStock AI'}</h1><p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">SaaS Partner Portal</p></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => router.push('/snapstock/login')} className="text-slate-400 hover:text-white uppercase font-black text-[10px]">Logout</Button>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500">
                        <Scan className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Scan to Sell</span>
                    </Button>
                    <Button onClick={() => document.getElementById('snap-intake-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600">
                        <Camera className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Bulk Intake</span>
                    </Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white" onClick={handleVoiceMic}>
                        <Mic className="h-8 w-8 text-indigo-500" />
                        <span className="font-bold uppercase text-xs text-slate-500">Voice Command</span>
                    </Button>
                    <Card className="h-24 rounded-[24px] shadow-sm border-none bg-white p-4 flex flex-col justify-center text-center">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Items</p>
                         <p className="text-3xl font-black italic">{inventory.reduce((sum, i) => sum + i.quantity, 0)}</p>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 px-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search inventory..." className="pl-9 h-12 rounded-xl bg-white shadow-sm border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex bg-white rounded-full p-1 border shadow-sm">
                        <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                        <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                    </div>
                </div>

                <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                     <Table>
                        <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8">Product</TableHead><TableHead>Location</TableHead><TableHead>Price (₹)</TableHead><TableHead>Stock</TableHead><TableHead className="text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredInventory.map(item => (
                                <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                    <TableCell className="pl-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border bg-slate-50 shadow-sm"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                            <div><p className="font-black uppercase italic text-sm text-slate-800">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="text-[10px] font-bold uppercase rounded-lg px-2">{item.shelfNumber}</Badge></TableCell>
                                    <TableCell className="font-black text-blue-600">₹{item.mrp}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => updateItemQty(item.id, -1)}><Minus className="h-4 w-4" /></Button>
                                            <span className={cn("font-black text-xl", item.quantity < 5 ? "text-red-500" : "text-slate-700")}>{item.quantity}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500" onClick={() => updateItemQty(item.id, 1)}><Plus className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8"><Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={() => deleteDocument('inventory', item.id).then(loadData)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </Card>
            </main>

            {/* SCANNER DIALOG */}
            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="max-w-sm rounded-[32px] p-6">
                    <DialogHeader><DialogTitle className="text-center uppercase font-black">Scan Product QR</DialogTitle></DialogHeader>
                    <div id="partner-reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div>
                    <DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUICK SALE DIALOG */}
            <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-w-md rounded-[32px] p-8">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Scan-to-Sell</DialogTitle></DialogHeader>
                    {selectedSaleItem && (
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                                <div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                <div><p className="font-black italic uppercase">{selectedSaleItem.name}</p><p className="text-xs text-primary font-bold">In Stock: {selectedSaleItem.quantity}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sell Qty</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sell Price (₹)</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg" onClick={async () => {
                                await updateItemQty(selectedSaleItem.id, -saleQty);
                                setSelectedSaleItem(null);
                            }}>Confirm Quick Sale</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
