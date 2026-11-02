
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
    Sun, Moon, Download, Printer, Layers, MessageSquare,
    FileText, FileCheck, FileUp, Zap, DollarSign
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn, sanitizePhoneNumber } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
    // Scanner & Sale State
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);
    const [isQrSearching, setIsQrSearching] = useState(false);
    const [textCommand, setTextCommand] = useState('');
    
    // Bill Intake State
    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    const [detectedIntakeItems, setDetectedIntakeItems] = useState<{
        productName: string, 
        qty: number, 
        mrp: number,
        purchasePrice: number,
        category: string, 
        imageDataUri?: string,
        needsCleanShot?: boolean
    }[]>([]);

    // REAL-TIME SYNC: Listen for inventory changes across ALL stores
    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as InventoryItem));
            setInventory(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Real-time sync error:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const shelf = item.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(item);
        });
        return groups;
    }, [inventory]);

    // QR SCANNER INITIALIZATION
    useEffect(() => {
        if (!isScanning) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText) => {
                const item = inventory.find(i => i.id === decodedText || i.name === decodedText);
                if (item) {
                    setSelectedSaleItem(item);
                    setSalePrice(item.mrp);
                    setSaleQty(1);
                    setIsScanning(false);
                    scanner.clear();
                    toast({ title: "Product Identified", description: item.name });
                } else {
                    toast({ variant: 'destructive', title: "SKU Not Found" });
                }
            }, (err) => {});
            return () => { scanner.clear().catch(() => {}); };
        }, 100);
        return () => clearTimeout(timer);
    }, [isScanning, inventory, toast]);

    const handlePrintLabel = (item: InventoryItem) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.id}`;
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>Label - ${item.name}</title><style>body { margin: 0; padding: 20px; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }.label { width: 80mm; height: 50mm; border: 2px solid black; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-sizing: border-box; }.title { font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }.content { display: flex; align-items: center; gap: 15px; width: 100%; }.qr { width: 80px; height: 80px; }.details { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }.price { font-weight: 900; font-size: 18px; }.shelf { font-size: 10px; font-weight: bold; background: #eee; padding: 2px 5px; border-radius: 4px; margin-top: 5px; }</style></head><body><div class="label"><div class="title">${item.name}</div><div class="content"><img src="${qrUrl}" class="qr" /><div class="details"><div class="price">₹${item.mrp}</div><div class="shelf">LOC: ${item.shelfNumber}</div></div></div></div><script>window.onload = function() { window.print(); window.close(); };</script></body></html>`);
        printWindow.document.close();
    };

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

    const recordMovement = async (item: InventoryItem, qty: number, type: MovementType, note?: string) => {
        const now = new Date().toISOString();
        const newQty = item.quantity + qty;
        const movement: StockMovement = {
            id: uuidv4(), productId: item.id, type, quantity: qty, date: now, note, previousStock: item.quantity, newStock: newQty
        };
        try {
            await Promise.all([
                saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: now }, item.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            toast({ title: "Stock Updated" });
            return true;
        } catch (e) { return false; }
    };

    const handleTextCommand = async (command: string) => {
        if (!command.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await parseInventoryCommand(command);
            setDetectedIntakeItems(result.items.map(i => ({ productName: i.productName, qty: i.quantity, mrp: 0, purchasePrice: 0, category: 'General', needsCleanShot: true })));
            toast({ title: "AI Command Parsed" });
        } catch (e) { toast({ variant: 'destructive', title: "Command Failed" }); }
        finally { setIsAnalyzing(false); setTextCommand(''); }
    };

    const handleBroadcastReport = (type: 'morning' | 'night') => {
        const lowStock = inventory.filter(i => i.quantity < 5);
        const totalValue = inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0);
        let message = `📦 *SNAPSTOCK REPORT: ${type.toUpperCase()}*\n\n`;
        let excelData = inventory.map(i => ({ Product: i.name, Qty: i.quantity, MRP: i.mrp, Wholesale: i.wholesalePrice, Value: i.quantity * i.mrp }));
        
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${type.toUpperCase()}_SnapStock_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

        window.open(`https://wa.me/919920320790?text=${encodeURIComponent(message)}`, '_blank');
        toast({ title: "Report Sent & Downloaded" });
    };

    const handleExportFullInventory = () => {
        const data = inventory.map(i => ({ 'ID': i.id, 'Name': i.name, 'Category': i.category, 'Shelf': i.shelfNumber, 'Qty': i.quantity, 'Wholesale': i.wholesalePrice, 'MRP': i.mrp, 'Total Value': i.quantity * i.mrp }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock");
        XLSX.writeFile(wb, `SnapStock_Master_Inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Excel Downloaded" });
    };

    const filteredInventory = inventory.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppShell title="SnapStock AI Dashboard">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none md:col-span-1">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Inventory Actions</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Button size="sm" variant="secondary" className="w-full rounded-xl" onClick={() => document.getElementById('bulk-intake-capture')?.click()}>
                                {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : <Layers className="h-4 w-4 mr-2" />} Bulk Intake
                             </Button>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => { 
                                    const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                                    if(!sr) return; 
                                    const r = new sr(); 
                                    r.onresult = (e: any) => handleTextCommand(e.results[0][0].transcript); 
                                    r.start(); 
                                }}><Mic className="h-3 w-3 mr-1" /> Voice</Button>
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsScanning(true)}><Scan className="h-3 w-3 mr-1" /> Scan</Button>
                             </div>
                             <input type="file" id="bulk-intake-capture" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                                 const f = e.target.files?.[0];
                                 if(!f) return;
                                 setIsAnalyzing(true);
                                 try {
                                     const uri = await resizeImage(f);
                                     const detections = await detectItemsInPhoto(uri, 'intake');
                                     setDetectedIntakeItems(detections.map(d => ({ productName: d.productName, qty: d.count, mrp: 0, purchasePrice: 0, category: d.category, imageDataUri: uri })));
                                 } finally { setIsAnalyzing(false); }
                             }} />
                        </CardContent>
                    </Card>

                    <Link href="/admin/inventory/audit" className="md:col-span-1">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Visual Audit</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4"><div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div><div className="text-xl font-bold italic">Shelf Check</div></CardContent>
                        </Card>
                    </Link>

                    <Card className="shadow-lg border-none bg-white h-full flex flex-col justify-center md:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Broadcasts</CardTitle></CardHeader>
                        <CardContent className="flex gap-2 pt-0">
                            <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 border-amber-100 text-amber-600" onClick={() => handleBroadcastReport('morning')}><Sun className="h-3 w-3 mr-1"/> MORNING</Button>
                            <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 border-indigo-100 text-indigo-600" onClick={() => handleBroadcastReport('night')}><Moon className="h-3 w-3 mr-1"/> NIGHT</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 text-white shadow-xl border-none relative group overflow-hidden md:col-span-1 cursor-pointer" onClick={handleExportFullInventory}>
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Download className="h-8 w-8 text-primary" /></div>
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total SKUs</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black">{inventory.length}</div></CardContent>
                    </Card>

                    <Card className="bg-slate-50 shadow-inner border-none flex flex-col justify-center p-4 md:col-span-1">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1 text-center">View Mode</p>
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}><List className="h-3 w-3 mr-1" /> List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}><MapIcon className="h-3 w-3 mr-1" /> Map</Button>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <Card className="flex-1 rounded-[28px] shadow-sm border-none bg-white p-2 flex items-center">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl ml-2"><MessageSquare className="h-6 w-6" /></div>
                        <Input placeholder="Type: 'Sold 2 items'..." className="flex-1 border-none focus-visible:ring-0 text-sm font-medium" value={textCommand} onChange={e => setTextCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTextCommand(textCommand)} />
                        <Button onClick={() => handleTextCommand(textCommand)} disabled={!textCommand || isAnalyzing} className="rounded-2xl mr-2">{isAnalyzing ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                    </Card>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search inventory..." className="pl-9 h-12 w-full md:w-64 rounded-2xl bg-white shadow-sm" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50"><TableRow><TableHead>Product</TableHead><TableHead>Location</TableHead><TableHead>Price (₹)</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div><p className="font-bold italic uppercase">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{item.shelfNumber}</Badge></TableCell>
                                            <TableCell><div className="font-black text-primary">₹{item.mrp}</div><div className="text-[8px] opacity-50">BUY: ₹{item.wholesalePrice}</div></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => recordMovement(item, -1, 'Sale')}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-lg", item.quantity < 5 && "text-red-500")}>{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => recordMovement(item, 1, 'Purchase')}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold" onClick={() => handlePrintLabel(item)}><Printer className="h-3 w-3 mr-1" /> Label</Button>
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold text-destructive" onClick={() => deleteDocument('inventory', item.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(shelfGroups).map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group hover:shadow-2xl transition-all">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl text-primary font-black italic">{shelf}</div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">{items.slice(0, 3).map(item => (<div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"><Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized /><div className="flex-1 min-w-0"><p className="text-[11px] font-black uppercase italic truncate">{item.name}</p><p className="text-[9px] font-bold text-primary">₹{item.mrp}</p></div></div>))}</CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* SCANNER DIALOG */}
            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="max-w-sm rounded-[32px] p-6">
                    <DialogHeader><DialogTitle className="text-center uppercase font-black">Scan to Sell</DialogTitle></DialogHeader>
                    <div id="reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div>
                    <DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUICK SALE DIALOG */}
            <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-w-md rounded-[32px] p-8">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Confirm Sale</DialogTitle></DialogHeader>
                    {selectedSaleItem && (
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl">
                                <div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                <div><p className="font-black italic uppercase">{selectedSaleItem.name}</p><p className="text-xs text-primary font-bold">Stock: {selectedSaleItem.quantity}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sell Qty</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sell Price (₹)</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg" onClick={() => recordMovement(selectedSaleItem, -saleQty, 'Sale', 'Quick Scan Sale')}>Record Sale</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
