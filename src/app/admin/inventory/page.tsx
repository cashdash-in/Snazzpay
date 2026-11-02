
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Camera, Plus, Minus, Search, 
    ShieldCheck, Sparkles, Send, Mic, Trash2,
    X, PackagePlus, Scan, Map as MapIcon, List, CheckCircle2,
    Printer, Layers, FileText, FileUp, Zap, DollarSign, MapPin
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
    // Scanner & Sale States
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);

    // Bill Intake State
    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    // REAL-TIME SYNC
    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as InventoryItem));
            setInventory(data);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // QR Scanner Logic
    useEffect(() => {
        if (!isScanning) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("admin-reader", { fps: 10, qrbox: 250 }, false);
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
                    id, storeId: 'admin', name: d.productName, quantity: d.count, mrp: 0, wholesalePrice: 0,
                    category: d.category || 'General', shelfNumber: 'A1', imageDataUri: uri, lastUpdated: new Date().toISOString()
                }, id);
            }
            toast({ title: "Bulk Intake Complete" });
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
            const newItem = {
                id,
                storeId: 'admin',
                name: result.productName,
                quantity: result.quantity,
                wholesalePrice: result.wholesalePrice,
                mrp: result.mrp,
                category: result.category,
                shelfNumber: 'A1',
                imageDataUri: productPhoto,
                lastUpdated: new Date().toISOString()
            };
            await saveDocument('inventory', newItem, id);
            toast({ title: "Bill Processed", description: `Added ${result.quantity} units of ${result.productName}` });
            setIsBillIntakeOpen(false);
            setBillPhoto(null);
            setProductPhoto(null);
        } catch (e) {
            toast({ variant: 'destructive', title: "Bill Analysis Failed" });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const handleVoiceCommand = () => {
        const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!sr) {
            toast({ variant: 'destructive', title: "Not Supported", description: "Your browser does not support speech recognition." });
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
                            id, storeId: 'admin', name: item.productName, quantity: item.quantity, mrp: 0, wholesalePrice: 0,
                            category: 'General', shelfNumber: 'A1', imageDataUri: 'https://picsum.photos/seed/voice/200/200', lastUpdated: new Date().toISOString()
                        }, id);
                    }
                }
                toast({ title: "Voice Command Processed", description: result.summary });
            } catch (err) {
                toast({ variant: 'destructive', title: "Voice Parse Failed" });
            } finally {
                setIsAnalyzing(false);
            }
        };
        r.start();
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        const now = new Date().toISOString();
        await saveDocument('inventory', { ...item, ...updates, lastUpdated: now }, id);
    };

    const handlePrint = () => {
        window.print();
    };

    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const shelf = item.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(item);
        });
        return groups;
    }, [inventory]);

    const filteredInventory = inventory.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppShell title="SnapStock AI Dashboard">
            <div className="space-y-6 print:p-0">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 no-print">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500 md:col-span-1">
                        <Scan className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Scan to Sell</span>
                    </Button>
                    <Button onClick={() => document.getElementById('admin-bulk-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600 md:col-span-1" disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Layers className="h-8 w-8" />}
                        <span className="font-bold uppercase text-xs">Bulk Intake</span>
                    </Button>
                    <Button onClick={() => setIsBillIntakeOpen(true)} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-indigo-200 text-indigo-600 md:col-span-1">
                        <FileUp className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Bill AI</span>
                    </Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white md:col-span-1" onClick={handleVoiceCommand} disabled={isAnalyzing}>
                        <Mic className="h-8 w-8 text-indigo-500" />
                        <span className="font-bold uppercase text-xs text-slate-500">Voice Link</span>
                    </Button>

                    <Card className="bg-slate-900 text-white shadow-xl border-none md:col-span-1">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Network</CardTitle></CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <div><p className="text-[10px] text-slate-500 uppercase font-bold">SKUs</p><p className="text-3xl font-black">{inventory.length}</p></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 shadow-inner border-none flex flex-col justify-center p-4 md:col-span-1">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1 text-center">View</p>
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                    </Card>
                    <input type="file" id="admin-bulk-input" accept="image/*" capture="environment" className="hidden" onChange={handleBulkIntake} />
                </div>

                <div className="relative px-2 no-print flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search global inventory..." className="pl-12 h-12 rounded-2xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white shadow-sm" onClick={handlePrint}>
                        <Printer className="h-5 w-5" />
                    </Button>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardContent className="p-0">
                            <Table id="inventory-table">
                                <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-8">Product</TableHead><TableHead>Loc</TableHead><TableHead>Purchase Rate</TableHead><TableHead>Selling Rate (MRP)</TableHead><TableHead>Stock</TableHead><TableHead className="text-right pr-8 no-print">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id} className="group transition-colors hover:bg-slate-50">
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div><p className="font-bold italic uppercase">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                                </div>
                                            </TableCell>
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
                                                    <span className="text-[10px] font-bold text-primary no-print">₹</span>
                                                    <Input 
                                                        type="number"
                                                        value={item.mrp} 
                                                        onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })}
                                                        className="w-24 h-8 font-black text-primary no-print"
                                                    />
                                                    <span className="hidden print:inline">₹{item.mrp}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3 no-print">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-lg", item.quantity < 5 && "text-red-500")}>{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                                <span className="hidden print:inline font-bold">{item.quantity}</span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8 no-print space-x-2">
                                                <Button variant="ghost" size="icon" className="text-red-300" onClick={() => deleteDocument('inventory', item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                         {Object.entries(shelfGroups).map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl text-primary font-black italic">{shelf}</div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">{items.slice(0, 3).map(item => (<div key={item.id} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-100"><Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized /><div className="flex-1 min-w-0"><p className="text-[11px] font-black uppercase italic truncate">{item.name}</p><p className="text-[9px] font-bold text-primary">MRP: ₹{item.mrp}</p></div></div>))}</CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* BILL INTAKE DIALOG */}
            <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none no-print">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-slate-800">Admin Bill Intake</DialogTitle><DialogDescription>Match supplier bills to products across the platform.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Supplier Bill</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-admin')?.click()}>
                                {billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}
                            </div>
                            <input type="file" id="bill-admin" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Product SKU</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('prod-admin')?.click()}>
                                {productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Product</span></>}
                            </div>
                            <input type="file" id="prod-admin" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>
                            {isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Process Admin Intake
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* SCANNER DIALOG */}
            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="max-w-sm rounded-[32px] p-6 no-print">
                    <DialogHeader><DialogTitle className="text-center uppercase font-black">Admin Scanner</DialogTitle></DialogHeader>
                    <div id="admin-reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div>
                    <DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUICK SALE DIALOG */}
            <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-md rounded-[32px] p-8 no-print">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Admin Quick Sale</DialogTitle></DialogHeader>
                    {selectedSaleItem && (
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                                <div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                <div><p className="font-black italic uppercase text-slate-800">{selectedSaleItem.name}</p><p className="text-xs text-blue-600 font-bold">Available: {selectedSaleItem.quantity}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Sell Quantity</Label><Input type="number" className="h-12 rounded-xl font-bold" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Unit Price (₹)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg bg-blue-600" onClick={async () => { await updateItem(selectedSaleItem.id, { quantity: selectedSaleItem.quantity - saleQty }); setSelectedSaleItem(null); toast({ title: "Sale Recorded" }); }}>Confirm Transaction</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                  .no-print { display: none !important; }
                  body { background: white !important; }
                  .print-p-0 { padding: 0 !important; }
                }
            `}</style>
        </AppShell>
    );
}
