
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
    FileSpreadsheet, Trash2, DollarSign, FileText, FileUp,
    MapPin, LayoutGrid, CheckCircle2, Printer
} from 'lucide-react';
import { getCollection, saveDocument, getDocument, deleteDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { detectItemsInPhoto, parseInventoryCommand, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { cn, sanitizePhoneNumber } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { increment } from 'firebase/firestore';

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
    
    // UI State
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<any | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);
    
    // Bill Intake State
    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    const partnerId = getCookie('snapstock_token') as string;

    const trackUsage = useCallback(async () => {
        if (!partnerId) return;
        await saveDocument('snapstock_partners', { snapUsage: increment(1) }, partnerId);
    }, [partnerId]);

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
                } else {
                    toast({ variant: 'destructive', title: "SKU Not Found" });
                }
            }, (err) => {});
            return () => { scanner.clear().catch(() => {}); };
        }, 100);
        return () => clearTimeout(timer);
    }, [isScanning, inventory, toast]);

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

    const handleBulkIntake = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            for (const d of detections) {
                const id = uuidv4();
                await saveDocument('inventory', {
                    id, storeId: partnerId, name: d.productName, quantity: d.count, mrp: 0, wholesalePrice: 0,
                    category: d.category || 'General', shelfNumber: 'A1', imageDataUri: uri, lastUpdated: new Date().toISOString()
                }, id);
            }
            await trackUsage();
            toast({ title: "Bulk Intake Complete" });
            loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: "Intake Failed" });
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    const handleProcessBill = async () => {
        if (!billPhoto || !productPhoto) return;
        setIsProcessingBill(true);
        try {
            const result = await matchProductToBill(billPhoto, productPhoto);
            const id = uuidv4();
            await saveDocument('inventory', {
                id, storeId: partnerId, name: result.productName, quantity: result.quantity, wholesalePrice: result.wholesalePrice, mrp: result.mrp,
                category: result.category, shelfNumber: 'A1', imageDataUri: productPhoto, lastUpdated: new Date().toISOString()
            }, id);
            await trackUsage();
            toast({ title: "Bill Matched!" });
            setIsBillIntakeOpen(false);
            setBillPhoto(null); setProductPhoto(null);
            loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: "Bill Analysis Failed" });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const handleVoiceCommand = () => {
        const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!sr) {
            toast({ variant: 'destructive', title: "Not Supported" });
            return;
        }
        const r = new sr();
        r.onresult = async (e: any) => {
            const text = e.results[0][0].transcript;
            setIsAnalyzing(true);
            try {
                const result = await parseInventoryCommand(text);
                for (const item of result.items) {
                    const existing = inventory.find(i => i.name.toLowerCase() === item.productName.toLowerCase());
                    if (existing) {
                        const newQty = Math.max(0, existing.quantity + item.quantity);
                        await saveDocument('inventory', { ...existing, quantity: newQty, lastUpdated: new Date().toISOString() }, existing.id);
                    } else if (item.quantity > 0) {
                        const id = uuidv4();
                        await saveDocument('inventory', {
                            id, storeId: partnerId, name: item.productName, quantity: item.quantity, mrp: 0, wholesalePrice: 0,
                            category: 'General', shelfNumber: 'A1', imageDataUri: 'https://picsum.photos/seed/voice/200/200', lastUpdated: new Date().toISOString()
                        }, id);
                    }
                }
                await trackUsage();
                toast({ title: "AI Voice Sync", description: result.summary });
                loadData();
            } catch (err) {
                toast({ variant: 'destructive', title: "Voice Parse Failed" });
            } finally {
                setIsAnalyzing(false);
            }
        };
        r.start();
    };

    const updateItem = async (id: string, updates: any) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        await saveDocument('inventory', { ...item, ...updates, lastUpdated: new Date().toISOString() }, id);
    };

    const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const shelfGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        inventory.forEach(item => {
            const s = item.shelfNumber || 'Unassigned';
            if (!groups[s]) groups[s] = [];
            groups[s].push(item);
        });
        return groups;
    }, [inventory]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-900 text-white p-4 md:px-8 flex justify-between items-center sticky top-0 z-50 shadow-xl no-print">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20"><Zap className="h-6 w-6 text-white" /></div>
                    <div><h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{partner?.storeName || 'SnapStock AI'}</h1><p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">SaaS Partner Portal</p></div>
                </div>
                <div className="flex items-center gap-4">
                     <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[9px] font-black h-6">Snap Usage: {partner?.snapUsage || 0}</Badge>
                     <Button variant="ghost" size="sm" onClick={() => router.push('/snapstock/login')} className="text-slate-400 hover:text-white uppercase font-black text-[10px]">Logout</Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 no-print">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500"><Scan className="h-8 w-8" /><span className="font-bold uppercase text-xs">Scan to Sell</span></Button>
                    <Button onClick={() => document.getElementById('snap-intake-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600" disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Layers className="h-8 w-8" />}<span className="font-bold uppercase text-xs">Bulk Snap Intake</span></Button>
                    <Button onClick={() => setIsBillIntakeOpen(true)} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-indigo-200 text-indigo-600"><FileUp className="h-8 w-8" /><span className="font-bold uppercase text-xs">Bill Intake (AI)</span></Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white" onClick={handleVoiceCommand} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Mic className="h-8 w-8 text-indigo-500" />}
                        <span className="font-bold uppercase text-xs text-slate-500">Voice Link</span>
                    </Button>
                    <Card className="h-24 rounded-[24px] shadow-sm border-none bg-white p-4 flex flex-col justify-center text-center"><p className="text-[10px] font-black uppercase text-slate-400 mb-1">Stock Value</p><p className="text-2xl font-black italic">₹{inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0).toLocaleString()}</p></Card>
                </div>
                
                <input type="file" id="snap-intake-input" accept="image/*" capture="environment" className="hidden" onChange={handleBulkIntake} />

                <div className="flex flex-col md:flex-row gap-4 px-2 no-print">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Search inventory..." className="pl-9 h-12 rounded-xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} /></div>
                    <div className="flex gap-2">
                        <div className="flex bg-white rounded-full p-1 border shadow-sm"><Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List View</Button><Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Shop Map</Button></div>
                        <Button variant="outline" className="h-12 w-12 rounded-full bg-white shadow-sm" onClick={handlePrint}><Printer className="h-5 w-5"/></Button>
                    </div>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8">Product</TableHead><TableHead>Loc</TableHead><TableHead>Purchase Rate</TableHead><TableHead>Selling Rate (MRP)</TableHead><TableHead>Quantity</TableHead><TableHead className="text-right pr-8 no-print">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="pl-8 py-4"><div className="flex items-center gap-4"><div className="relative w-12 h-12 rounded-xl overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div><div><p className="font-black uppercase italic text-sm text-slate-800">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div></div></TableCell>
                                        <TableCell>
                                            <Input 
                                                value={item.shelfNumber} 
                                                onChange={e => updateItem(item.id, { shelfNumber: e.target.value })}
                                                className="w-16 h-8 text-[10px] font-bold uppercase no-print"
                                            />
                                            <span className="hidden print:inline">{item.shelfNumber}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 no-print">₹</span>
                                                <Input 
                                                    type="number"
                                                    value={item.wholesalePrice} 
                                                    onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })}
                                                    className="w-24 h-8 font-bold no-print"
                                                />
                                                <span className="hidden print:inline">₹{item.wholesalePrice}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-bold text-blue-600 no-print">₹</span>
                                                <Input 
                                                    type="number"
                                                    value={item.mrp} 
                                                    onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })}
                                                    className="w-24 h-8 font-black text-blue-600 no-print"
                                                />
                                                <span className="hidden print:inline">₹{item.mrp}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 no-print">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-4 w-4" /></Button>
                                                <span className={cn("font-black text-xl", item.quantity < 5 ? "text-red-500" : "text-slate-700")}>{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <span className="hidden print:inline font-bold">{item.quantity}</span>
                                        </TableCell>
                                        <TableCell className="text-right pr-8 space-x-2 no-print"><Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500" onClick={() => deleteDocument('inventory', item.id).then(loadData)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500 no-print">
                        {Object.entries(shelfGroups).map(([shelf, items]) => {
                            const shelfStock = items.reduce((sum, i) => sum + i.quantity, 0);
                            const density = Math.min(100, (items.length / 10) * 100);
                            return (
                                <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group hover:shadow-2xl transition-all">
                                    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl font-black italic"><MapPin className="h-4 w-4" /></div>
                                            <CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle>
                                        </div>
                                        <Badge className="bg-slate-900 text-[10px] font-black italic">Stock: {shelfStock}</Badge>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={cn("h-full transition-all duration-1000", items.length > 5 ? "bg-red-500" : "bg-blue-500")} 
                                                 style={{ width: `${density}%` }}>
                                            </div>
                                        </div>
                                        {items.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                                <Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black uppercase italic truncate text-slate-800">{item.name}</p>
                                                    <p className="text-[8px] font-bold text-blue-500">₹{item.mrp}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* BILL INTAKE DIALOG */}
            <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none no-print"><DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-slate-800">AI Bill Intake</DialogTitle><DialogDescription>Upload your supplier bill and the product photo to sync wholesale costs.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">1. Supplier Bill</Label><div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-upload')?.click()}>{billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}</div><input type="file" id="bill-upload" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">2. Product Photo</Label><div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('product-upload')?.click()}>{productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Product</span></>}</div><input type="file" id="product-upload" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} /></div></div>
                    <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-blue-600 shadow-xl shadow-blue-900/20" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>{isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Match & Sync to Stock</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isScanning} onOpenChange={setIsScanning}><DialogContent className="max-w-sm rounded-[32px] p-6 no-print"><DialogHeader><DialogTitle className="text-center uppercase font-black">Scan Product QR</DialogTitle></DialogHeader><div id="partner-reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div><DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter></DialogContent></Dialog>

            <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-md rounded-[32px] p-8 no-print"><DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Confirm Sale</DialogTitle></DialogHeader>
                    {selectedSaleItem && (
                        <div className="space-y-6 pt-4"><div className="flex gap-4 p-4 bg-slate-50 rounded-2xl"><div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div><div><p className="font-black italic uppercase text-slate-800">{selectedSaleItem.name}</p><p className="text-xs text-blue-600 font-bold">Available: {selectedSaleItem.quantity}</p></div></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Sell Quantity</Label><Input type="number" className="h-12 rounded-xl font-bold" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Unit Price (₹)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div></div><Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg bg-blue-600 shadow-xl shadow-blue-900/20" onClick={async () => { await updateItem(selectedSaleItem.id, { quantity: selectedSaleItem.quantity - saleQty }); setSelectedSaleItem(null); toast({ title: "Sale Completed!" }); }}>Confirm Transaction</Button></div>
                    )}
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                  .no-print { display: none !important; }
                  body { background: white !important; }
                  header, .fixed { display: none !important; }
                  main { padding: 0 !important; width: 100% !important; max-width: 100% !important; }
                  .rounded-[32px] { border-radius: 0 !important; border: 1px solid #eee !important; box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
