'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Zap, Camera, Layers, Mic, Search, 
    Scan, Loader2, Sparkles, Plus, Minus,
    FileSpreadsheet, Trash2, FileUp, FileText,
    MapPin, Printer, ImagePlus, ShieldCheck, TrendingUp, Info, History, Factory, Phone
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import { format, parseISO, subDays } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { detectItemsInPhoto, parseInventoryCommand, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { increment, collection, query, onSnapshot, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import { AppShell } from '@/components/layout/app-shell';

const MAX_IMAGE_SIZE_PX = 800;

export default function ZiptallyPartnerDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const [partner, setPartner] = useState<any | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);
    
    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
    const [selectedProductForStats, setSelectedProductForStats] = useState<InventoryItem | null>(null);

    const partnerId = getCookie('snapstock_token') as string;

    const filteredInventory = useMemo(() => {
        return inventory.filter(i => 
            (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (i.id || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const s = item.shelfNumber || 'A1';
            if (!groups[s]) groups[s] = [];
            groups[s].push(item);
        });
        return groups;
    }, [inventory]);

    const productStats = useMemo(() => {
        if (!selectedProductForStats) return [];
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = subDays(new Date(), i);
            return format(d, 'yyyy-MM-dd');
        }).reverse();

        return last30Days.map(day => {
            const dayMovements = movements.filter(m => 
                m.productId === selectedProductForStats.id && 
                m.date.startsWith(day) &&
                m.type === 'Sale'
            );
            return {
                name: format(parseISO(day), 'MMM dd'),
                sales: Math.abs(dayMovements.reduce((sum, m) => sum + m.quantity, 0))
            };
        });
    }, [selectedProductForStats, movements]);

    useEffect(() => {
        if (!partnerId || !db) return;
        
        const partnerUnsub = onSnapshot(doc(db, 'snapstock_partners', partnerId), (doc) => {
            if(doc.exists()) setPartner(doc.data());
        });

        const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
        const invUnsub = onSnapshot(q, (snapshot) => {
            const storeInventory = snapshot.docs
                .map(doc => doc.data() as InventoryItem)
                .filter(i => i.storeId === partnerId);
            setInventory(storeInventory);
            setIsLoading(false);
        });

        const mq = query(collection(db, 'inventory_movements'), orderBy('date', 'desc'));
        const mUnsub = onSnapshot(mq, (snapshot) => {
            setMovements(snapshot.docs.map(doc => doc.data() as StockMovement));
        });

        return () => { partnerUnsub(); invUnsub(); mUnsub(); };
    }, [partnerId]);

    const trackUsage = useCallback(async () => {
        if (!partnerId) return;
        await saveDocument('snapstock_partners', { snapUsage: increment(1) }, partnerId);
    }, [partnerId]);

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
                const [ymin, xmin, ymax, xmax] = box;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const width = (xmax - xmin) * img.width / 1000;
                const height = (ymax - ymin) * img.height / 1000;
                const startX = xmin * img.width / 1000;
                const startY = ymin * img.height / 1000;
                canvas.width = width; canvas.height = height;
                ctx?.drawImage(img, startX, startY, width, height, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = base64;
        });
    };

    const updateItem = async (id: string, updates: any) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        await saveDocument('inventory', { ...item, ...updates, lastUpdated: new Date().toISOString() }, id);
        await trackUsage();
    };

    const handleBulkIntake = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            
            const mergedBatch = new Map<string, any>();
            for (const d of detections) {
                const name = d.productName.trim().toLowerCase();
                if (mergedBatch.has(name)) {
                    mergedBatch.get(name).count += d.count;
                } else {
                    mergedBatch.set(name, { ...d });
                }
            }

            for (const [name, d] of mergedBatch.entries()) {
                const existing = inventory.find(i => (i.name || '').toLowerCase().trim() === name);
                
                if (existing) {
                    await updateItem(existing.id, { quantity: existing.quantity + d.count });
                } else {
                    const id = uuidv4();
                    let itemImage = uri;
                    if (d.box_2d) {
                        try { itemImage = await cropImage(uri, d.box_2d); } catch (err) {}
                    }
                    const newItem = {
                        id, storeId: partnerId, name: d.productName, quantity: d.count, mrp: 0, wholesalePrice: 0,
                        category: d.category || 'General', shelfNumber: 'A1', imageDataUri: itemImage, lastUpdated: new Date().toISOString()
                    };
                    await saveDocument('inventory', newItem, id);
                }
            }
            await trackUsage();
            toast({ title: "Bulk Intake Processed" });
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
            for (const m of result.matches) {
                const cleanName = m.productName.trim().toLowerCase();
                const existing = inventory.find(i => (i.name || '').toLowerCase().trim() === cleanName);
                
                if (existing) {
                    await updateItem(existing.id, { 
                        quantity: existing.quantity + m.quantity,
                        wholesalePrice: m.wholesalePrice,
                        mrp: m.mrp,
                        supplierName: result.supplier.name,
                        supplierContact: result.supplier.contact
                    });
                } else {
                    const id = uuidv4();
                    let itemImage = productPhoto;
                    if (m.box_2d) {
                        try { itemImage = await cropImage(productPhoto, m.box_2d); } catch (err) {}
                    }
                    const newItem = {
                        id, storeId: partnerId, name: m.productName, quantity: m.quantity, wholesalePrice: m.wholesalePrice, mrp: m.mrp,
                        category: m.category, shelfNumber: 'A1', imageDataUri: itemImage, lastUpdated: new Date().toISOString(),
                        supplierName: result.supplier.name, supplierContact: result.supplier.contact
                    };
                    await saveDocument('inventory', newItem, id);
                }
            }
            await trackUsage();
            toast({ title: "Bill Sync Complete" });
            setIsBillIntakeOpen(false);
            setBillPhoto(null); setProductPhoto(null);
        } catch (e) {
            toast({ variant: 'destructive', title: "Bill Analysis Failed" });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const handleVoiceCommand = () => {
        const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!sr) return;
        const r = new sr();
        r.onresult = async (e: any) => {
            const text = e.results[0][0].transcript;
            setIsAnalyzing(true);
            try {
                const result = await parseInventoryCommand(text);
                for (const item of result.items) {
                    const cleanName = item.productName.trim().toLowerCase();
                    const existing = inventory.find(i => (i.name || '').toLowerCase().trim() === cleanName);
                    
                    if (existing) {
                        await updateItem(existing.id, { quantity: Math.max(0, existing.quantity + item.quantity) });
                    } else if (item.quantity > 0) {
                        const id = uuidv4();
                        const newItem = {
                            id, storeId: partnerId, name: item.productName, quantity: item.quantity, mrp: 0, wholesalePrice: 0,
                            category: 'General', shelfNumber: 'A1', imageDataUri: 'https://picsum.photos/seed/voice/200/200', lastUpdated: new Date().toISOString()
                        };
                        await saveDocument('inventory', newItem, id);
                    }
                }
                await trackUsage();
                toast({ title: "Voice Sync Complete" });
            } finally {
                setIsAnalyzing(false);
            }
        };
        r.start();
    };

    return (
        <AppShell title={partner?.storeName || 'Ziptally Partner'}>
            <div className="space-y-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 no-print">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500"><Scan className="h-8 w-8" /><span className="font-bold uppercase text-xs">Scan to Sell</span></Button>
                    <Button onClick={() => document.getElementById('partner-bulk-snap')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600" disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Layers className="h-8 w-8" />}<span className="font-bold uppercase text-xs">Bulk Snap</span></Button>
                    <Button onClick={() => setIsBillIntakeOpen(true)} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-indigo-200 text-indigo-600"><FileUp className="h-8 w-8" /><span className="font-bold uppercase text-xs">Bill AI</span></Button>
                    <Button onClick={() => router.push('/ziptally/audit')} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-purple-200 text-purple-600">
                        <ShieldCheck className="h-8 w-8" /><span className="font-bold uppercase text-xs">Shelf Audit</span>
                    </Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white" onClick={handleVoiceCommand} disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Mic className="h-8 w-8 text-indigo-500" />}<span className="font-bold uppercase text-xs text-slate-500">Voice Sync</span></Button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 px-2 no-print">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Search name, supplier..." className="pl-9 h-12 rounded-xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-12 px-6 rounded-full bg-white shadow-sm font-black uppercase text-[10px] italic" onClick={() => {
                            const ws = XLSX.utils.json_to_sheet(inventory.map(i => ({ Product: i.name, Wholesaler: i.supplierName || 'N/A', Stock: i.quantity, Purchase: i.wholesalePrice, MRP: i.mrp })));
                            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Stock"); XLSX.writeFile(wb, "Inventory.xlsx");
                        }}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export Master</Button>
                        <div className="flex bg-white rounded-full p-1 border shadow-sm h-12">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-10 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-10 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                        <Button variant="outline" className="h-12 w-12 rounded-full bg-white shadow-sm" onClick={() => window.print()}><Printer className="h-5 w-5"/></Button>
                    </div>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="pl-8">Intelligence Feed</TableHead>
                                    <TableHead>Wholesaler</TableHead>
                                    <TableHead>Purchase</TableHead>
                                    <TableHead>MRP</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right pr-8 no-print">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50">
                                        <TableCell className="pl-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-12 rounded-xl overflow-hidden border cursor-pointer" onClick={() => { setUpdatingImageId(item.id); document.getElementById('partner-image-update')?.click(); }}>
                                                    <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity"><ImagePlus className="h-4 w-4 text-white" /></div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            value={item.name} 
                                                            onChange={e => updateItem(item.id, { name: e.target.value })}
                                                            className="h-8 font-black uppercase italic border-transparent hover:border-input focus:border-input bg-transparent w-48 text-sm"
                                                        />
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-30 hover:opacity-100" onClick={() => setSelectedProductForStats(item)}>
                                                            <Info className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-[9px] font-mono opacity-50 ml-3">{item.id.substring(0,8)} • {item.shelfNumber || 'A1'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input 
                                                value={item.supplierName || ''} 
                                                placeholder="Edit Supplier"
                                                onChange={e => updateItem(item.id, { supplierName: e.target.value })} 
                                                className="h-8 text-[10px] font-bold border-transparent hover:border-input focus:border-input bg-transparent no-print" 
                                            />
                                            <span className="hidden print:inline">{item.supplierName || 'N/A'}</span>
                                        </TableCell>
                                        <TableCell><div className="flex items-center gap-1"><span className="text-[10px] font-bold text-slate-400 no-print">₹</span><Input type="number" value={item.wholesalePrice} onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })} className="w-20 h-8 font-bold no-print" /><span className="hidden print:inline">₹{item.wholesalePrice}</span></div></TableCell>
                                        <TableCell><div className="flex items-center gap-1"><span className="text-[10px] font-bold text-blue-600 no-print">₹</span><Input type="number" value={item.mrp} onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })} className="w-20 h-8 font-black text-blue-600 no-print" /><span className="hidden print:inline">₹{item.mrp}</span></div></TableCell>
                                        <TableCell><div className="flex items-center gap-3 no-print"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => updateItem(item.id, { quantity: Math.max(0, (item.quantity || 0) - 1) })}><Minus className="h-4 w-4" /></Button><span className="font-black text-xl">{item.quantity || 0}</span><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => updateItem(item.id, { quantity: (item.quantity || 0) + 1 })}><Plus className="h-4 w-4" /></Button></div><span className="hidden print:inline">{item.quantity}</span></TableCell>
                                        <TableCell className="text-right pr-8 no-print"><Button variant="ghost" size="icon" className="text-slate-200" onClick={() => deleteDocument('inventory', item.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                        {Object.entries(shelfGroups).map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group hover:shadow-2xl transition-all">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4 px-6">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-xl font-black italic"><MapPin className="h-4 w-4" /></div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Stock: {items.reduce((sum, i) => sum + (i.quantity || 0), 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    {items.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer" onClick={() => setSelectedProductForStats(item)}>
                                            <div className="relative h-8 w-8 rounded-lg overflow-hidden border"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase italic truncate">{item.name}</p><p className="text-[8px] font-bold text-blue-500">₹{item.mrp}</p></div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* MODALS */}
                <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                    <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none no-print">
                        <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-slate-800">AI Bill Intake</DialogTitle><DialogDescription>Upload your supplier bill and the GROUP PHOTO to sync wholesale costs.</DialogDescription></DialogHeader>
                        <div className="grid grid-cols-2 gap-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">1. Supplier Bill</Label>
                                <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-upload')?.click()}>
                                    {billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}
                                </div>
                                <input type="file" id="bill-upload" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">2. Product GROUP PHOTO</Label>
                                <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('product-upload')?.click()}>
                                    {productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Group</span></>}
                                </div>
                                <input type="file" id="product-upload" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                            </div>
                        </div>
                        <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-blue-600" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>{isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Match & Merge to Stock</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!selectedProductForStats} onOpenChange={open => !open && setSelectedProductForStats(null)}>
                    <DialogContent className="max-w-4xl rounded-[40px] p-0 overflow-hidden border-none bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="bg-slate-900 text-white p-10 space-y-8">
                                {selectedProductForStats && (
                                    <>
                                        <div className="flex gap-6 items-center">
                                            <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10"><Image src={selectedProductForStats.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">{selectedProductForStats.name}</h3>
                                                <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[9px] font-black">Ref: {selectedProductForStats.id.substring(0,8)}</Badge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Stock Level</p>
                                                <p className="text-3xl font-black italic">{selectedProductForStats.quantity}</p>
                                            </div>
                                            <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-900/20">
                                                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Profit/Unit</p>
                                                <p className="text-3xl font-black italic">₹{(selectedProductForStats.mrp - selectedProductForStats.wholesalePrice).toFixed(0)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Wholesaler Details</Label>
                                            <div className="space-y-3">
                                                <div className="relative"><Factory className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input className="pl-9 h-11 bg-white/5 border-white/10 text-white rounded-xl" value={selectedProductForStats.supplierName || ''} onChange={e => updateItem(selectedProductForStats.id, { supplierName: e.target.value })} placeholder="Source/Supplier Name" /></div>
                                                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input className="pl-9 h-11 bg-white/5 border-white/10 text-white rounded-xl" value={selectedProductForStats.supplierContact || ''} onChange={e => updateItem(selectedProductForStats.id, { supplierContact: e.target.value })} placeholder="Supplier Contact" /></div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2 text-slate-800"><TrendingUp className="text-blue-600"/> Performance</h4>
                                    <Badge className="bg-slate-100 text-slate-600 border-none uppercase text-[9px] font-bold">Sales Velocity</Badge>
                                </div>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={productStats}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><History className="h-4 w-4"/> Stock History</h4>
                                    <div className="space-y-2">
                                        {movements.filter(m => m.productId === selectedProductForStats?.id).slice(0, 3).map(m => (
                                            <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div><p className="text-[10px] font-black uppercase text-slate-800">{m.type}</p><p className="text-[8px] text-slate-400 font-bold uppercase">{format(parseISO(m.date), 'PPP p')}</p></div>
                                                <p className={cn("font-black italic", m.quantity > 0 ? "text-green-600" : "text-red-600")}>{m.quantity > 0 ? '+' : ''}{m.quantity}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <DialogClose asChild><Button className="w-full h-14 rounded-2xl font-black uppercase italic tracking-widest mt-4">Close Intelligence</Button></DialogClose>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* SCANNER DIALOG */}
                <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogContent className="max-w-sm rounded-[32px] p-6 no-print">
                        <DialogHeader><DialogTitle className="text-center uppercase font-black">Mobile Scanner</DialogTitle></DialogHeader>
                        <div id="partner-reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div>
                        <DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* QUICK SALE DIALOG */}
                <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                    <DialogContent className="max-md rounded-[32px] p-8 no-print">
                        <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Confirm Sale</DialogTitle></DialogHeader>
                        {selectedSaleItem && (
                            <div className="space-y-6 pt-4">
                                <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl"><div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div><div><p className="font-black italic uppercase text-slate-800">{selectedSaleItem.name}</p><p className="text-xs text-blue-600 font-bold">Available: {selectedSaleItem.quantity}</p></div></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Qty</Label><Input type="number" className="h-12 rounded-xl font-bold" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Price (₹)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                                </div>
                                <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg bg-blue-600" onClick={async () => { await updateItem(selectedSaleItem.id, { quantity: (selectedSaleItem.quantity || 0) - saleQty }); setSelectedSaleItem(null); toast({ title: "Sale Recorded" }); }}>Confirm Transaction</Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            
            <input type="file" id="partner-bulk-snap" accept="image/*" className="hidden" onChange={handleBulkIntake} />
            <input type="file" id="partner-image-update" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f && updatingImageId) resizeImage(f).then(uri => updateItem(updatingImageId, { imageDataUri: uri })); }} />

            <style jsx global>{`
                @media print {
                  .no-print { display: none !important; }
                  body { background: white !important; }
                }
            `}</style>
        </AppShell>
    );
}
