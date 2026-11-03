
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Camera, Plus, Minus, Search, 
    Sparkles, Mic, Trash2, PackagePlus, Scan,
    Printer, FileUp, FileText, ImagePlus, FileSpreadsheet,
    MapPin, Layers
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { InventoryItem } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
    const [isScanning, setIsScanning] = useState(false);
    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);

    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as InventoryItem));
            setInventory(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!isScanning) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("admin-reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText) => {
                const item = inventory.find(i => i.id === decodedText || i.name.toLowerCase() === decodedText.toLowerCase());
                if (item) {
                    setSelectedSaleItem(item);
                    setSalePrice(item.mrp);
                    setSaleQty(1);
                    setIsScanning(false);
                    scanner.clear();
                } else {
                    toast({ variant: 'destructive', title: "SKU Not Found" });
                }
            }, () => {});
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

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const item = inventory.find(i => i.id === id);
        if (!item) return;
        await saveDocument('inventory', { ...item, ...updates, lastUpdated: new Date().toISOString() }, id);
    };

    const handleBulkIntake = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            
            // Group by name for merge logic
            const sessionGroups = new Map<string, any>();
            for (const d of detections) {
                const cleanName = d.productName.trim();
                if (sessionGroups.has(cleanName)) {
                    sessionGroups.get(cleanName).count += d.count;
                } else {
                    sessionGroups.set(cleanName, { ...d });
                }
            }

            for (const [name, d] of sessionGroups.entries()) {
                const existing = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
                if (existing) {
                    await updateItem(existing.id, { quantity: existing.quantity + d.count });
                } else {
                    const id = uuidv4();
                    let itemImage = uri;
                    if (d.box_2d) {
                        try { itemImage = await cropImage(uri, d.box_2d); } catch (e) {}
                    }
                    await saveDocument('inventory', {
                        id, storeId: 'admin', name: d.productName, quantity: d.count, mrp: 0, wholesalePrice: 0,
                        category: d.category || 'General', shelfNumber: 'A1', imageDataUri: itemImage, lastUpdated: new Date().toISOString()
                    }, id);
                }
            }
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
            const matchedItems = await matchProductToBill(billPhoto, productPhoto);
            for (const result of matchedItems) {
                const existing = inventory.find(i => i.name.toLowerCase() === result.productName.toLowerCase());
                if (existing) {
                    await updateItem(existing.id, { 
                        quantity: existing.quantity + result.quantity,
                        wholesalePrice: result.wholesalePrice,
                        mrp: result.mrp
                    });
                } else {
                    const id = uuidv4();
                    let itemImage = productPhoto;
                    if (result.box_2d) {
                        try { itemImage = await cropImage(productPhoto, result.box_2d); } catch (e) {}
                    }
                    await saveDocument('inventory', {
                        id, storeId: 'admin', name: result.productName, quantity: result.quantity, wholesalePrice: result.wholesalePrice, mrp: result.mrp,
                        category: result.category, shelfNumber: 'A1', imageDataUri: itemImage, lastUpdated: new Date().toISOString()
                    }, id);
                }
            }
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
                    const existing = inventory.find(i => i.name.toLowerCase() === item.productName.toLowerCase());
                    if (existing) {
                        await updateItem(existing.id, { quantity: Math.max(0, existing.quantity + item.quantity) });
                    } else if (item.quantity > 0) {
                        const id = uuidv4();
                        await saveDocument('inventory', {
                            id, storeId: 'admin', name: item.productName, quantity: item.quantity, mrp: 0, wholesalePrice: 0,
                            category: 'General', shelfNumber: 'A1', imageDataUri: 'https://picsum.photos/seed/voice/200/200', lastUpdated: new Date().toISOString()
                        }, id);
                    }
                }
                toast({ title: "Voice Sync Complete" });
            } finally {
                setIsAnalyzing(false);
            }
        };
        r.start();
    };

    const exportToExcel = () => {
        const data = inventory.map(item => ({
            'Marker ID': item.id,
            'Product Name': item.name,
            'Category': item.category,
            'Shelf': item.shelfNumber,
            'Purchase Rate (₹)': item.wholesalePrice,
            'Selling Rate (MRP) (₹)': item.mrp,
            'Quantity': item.quantity,
            'Last Sync': format(new Date(item.lastUpdated), 'PP p')
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Admin Inventory");
        XLSX.writeFile(wb, `Global_Inventory_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredInventory = inventory.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppShell title="Global Inventory Dashboard">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 no-print">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500">
                        <Scan className="h-8 w-8" /><span className="font-bold uppercase text-xs">Scan to Sell</span>
                    </Button>
                    <Button onClick={() => document.getElementById('admin-bulk-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600" disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Layers className="h-8 w-8" />}
                        <span className="font-bold uppercase text-xs">Bulk Intake</span>
                    </Button>
                    <Button onClick={() => setIsBillIntakeOpen(true)} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-indigo-200 text-indigo-600">
                        <FileUp className="h-8 w-8" /><span className="font-bold uppercase text-xs">Bill AI</span>
                    </Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white" onClick={handleVoiceCommand} disabled={isAnalyzing}>
                        <Mic className="h-8 w-8 text-indigo-500" /><span className="font-bold uppercase text-xs text-slate-500">Voice Sync</span>
                    </Button>
                    <Card className="bg-slate-900 text-white shadow-xl border-none p-4 flex flex-col justify-center text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Total SKUs</p>
                        <p className="text-3xl font-black">{inventory.length}</p>
                    </Card>
                    <Card className="bg-slate-50 shadow-inner border-none p-4">
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                    </Card>
                </div>

                <div className="flex gap-4 no-print">
                    <div className="relative flex-1">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search global inventory..." className="pl-12 h-12 rounded-2xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-2xl bg-white shadow-sm font-black uppercase text-[10px] italic" onClick={exportToExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Master
                    </Button>
                    <Button variant="outline" className="h-12 w-12 rounded-2xl bg-white shadow-sm" onClick={() => window.print()}><Printer className="h-5 w-5"/></Button>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="pl-8">Product</TableHead>
                                    <TableHead>Loc</TableHead>
                                    <TableHead>Purchase Rate</TableHead>
                                    <TableHead>Selling Rate (MRP)</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right pr-8 no-print">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50">
                                        <TableCell className="pl-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50 cursor-pointer group/img"
                                                    onClick={() => { setUpdatingImageId(item.id); document.getElementById('image-update-input')?.click(); }}
                                                >
                                                    <Image src={item.imageDataUri} fill alt="p" className="object-cover group-hover/img:opacity-50 transition-opacity" unoptimized />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><ImagePlus className="h-4 w-4 text-primary" /></div>
                                                </div>
                                                <div><p className="font-bold italic uppercase">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Input value={item.shelfNumber} onChange={e => updateItem(item.id, { shelfNumber: e.target.value })} className="w-16 h-8 text-[10px] font-bold uppercase no-print" /><span className="hidden print:inline">{item.shelfNumber}</span></TableCell>
                                        <TableCell><div className="flex items-center gap-1"><span className="text-[10px] font-bold text-slate-400 no-print">₹</span><Input type="number" value={item.wholesalePrice} onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })} className="w-24 h-8 font-bold no-print" /><span className="hidden print:inline">₹{item.wholesalePrice}</span></div></TableCell>
                                        <TableCell><div className="flex items-center gap-1"><span className="text-[10px] font-bold text-primary no-print">₹</span><Input type="number" value={item.mrp} onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })} className="w-24 h-8 font-black text-primary no-print" /><span className="hidden print:inline">₹{item.mrp}</span></div></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 no-print">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-4 w-4" /></Button>
                                                <span className={cn("font-black text-lg", item.quantity < 5 && "text-red-500")}>{item.quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                            <span className="hidden print:inline font-bold">{item.quantity}</span>
                                        </TableCell>
                                        <TableCell className="text-right pr-8 no-print"><Button variant="ghost" size="icon" className="text-red-300" onClick={() => deleteDocument('inventory', item.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                         {Object.entries(inventory.reduce((acc: any, i) => { const s = i.shelfNumber || 'A1'; if(!acc[s]) acc[s] = []; acc[s].push(i); return acc; }, {})).map(([shelf, items]: [string, any]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl text-primary font-black italic">{shelf}</div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Qty: {items.reduce((sum: number, i: any) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    {items.slice(0, 3).map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                            <div className="relative h-8 w-8 rounded-lg overflow-hidden border"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                            <div className="flex-1 min-w-0"><p className="text-[11px] font-black uppercase italic truncate">{item.name}</p><p className="text-[9px] font-bold text-primary">MRP: ₹{item.mrp}</p></div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none no-print">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-slate-800">Admin Bill Intake</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Supplier Bill</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-admin')?.click()}>
                                {billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}
                            </div>
                            <input type="file" id="bill-admin" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Group Photo</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('prod-admin')?.click()}>
                                {productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Group</span></>}
                            </div>
                            <input type="file" id="prod-admin" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                        </div>
                    </div>
                    <DialogFooter><Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>{isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Process Admin Intake</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="max-w-sm rounded-[32px] p-6 no-print"><DialogHeader><DialogTitle className="text-center uppercase font-black">Admin Scanner</DialogTitle></DialogHeader><div id="admin-reader" className="w-full aspect-square rounded-2xl overflow-hidden border-2 bg-slate-50"></div><DialogFooter><Button variant="outline" className="w-full rounded-xl" onClick={() => setIsScanning(false)}>Cancel</Button></DialogFooter></DialogContent>
            </Dialog>

            <Dialog open={!!selectedSaleItem} onOpenChange={(open) => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-md rounded-[32px] p-8 no-print">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Admin Quick Sale</DialogTitle></DialogHeader>
                    {selectedSaleItem && (
                        <div className="space-y-6 pt-4">
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl"><div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white"><Image src={selectedSaleItem.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div><div><p className="font-black italic uppercase text-slate-800">{selectedSaleItem.name}</p><p className="text-xs text-blue-600 font-bold">Available: {selectedSaleItem.quantity}</p></div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Qty</Label><Input type="number" className="h-12 rounded-xl font-bold" value={saleQty} onChange={e => setSaleQty(Number(e.target.value))} /></div>
                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Price (₹)</Label><Input type="number" className="h-12 rounded-xl font-bold" value={actualSellPrice} onChange={e => setSalePrice(Number(e.target.value))} /></div>
                            </div>
                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg bg-blue-600" onClick={async () => { await updateItem(selectedSaleItem.id, { quantity: selectedSaleItem.quantity - saleQty }); setSelectedSaleItem(null); toast({ title: "Sale Recorded" }); }}>Confirm Transaction</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            <input type="file" id="admin-bulk-input" accept="image/*" className="hidden" onChange={handleBulkIntake} />
            <input type="file" id="image-update-input" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f && updatingImageId) resizeImage(f).then(uri => updateItem(updatingImageId, { imageDataUri: uri })); }} />

            <style jsx global>{`
                @media print {
                  .no-print { display: none !important; }
                  body { background: white !important; }
                }
            `}</style>
        </AppShell>
    );
}
