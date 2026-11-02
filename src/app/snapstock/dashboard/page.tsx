
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
    MapPin, LayoutGrid, CheckCircle2
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
        // Increment snapUsage in the partner's license record
        await saveDocument('snapstock_partners', { 
            snapUsage: increment(1) 
        }, partnerId);
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

    // QR SCANNER
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
                    toast({ title: "Product Found" });
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
                    id,
                    storeId: partnerId,
                    name: d.productName,
                    quantity: d.count,
                    mrp: 0,
                    wholesalePrice: 0,
                    category: d.category || 'General',
                    shelfNumber: 'A1',
                    imageDataUri: uri, // In full implementation, we'd use crop boxes here
                    lastUpdated: new Date().toISOString()
                }, id);
            }
            await trackUsage();
            toast({ title: "Bulk Intake Complete", description: `Added ${detections.length} new SKUs.` });
            loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: "Intake Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleProcessBill = async () => {
        if (!billPhoto || !productPhoto) return;
        setIsProcessingBill(true);
        try {
            const result = await matchProductToBill(billPhoto, productPhoto);
            const id = uuidv4();
            await saveDocument('inventory', {
                id,
                storeId: partnerId,
                name: result.productName,
                quantity: result.quantity,
                wholesalePrice: result.wholesalePrice,
                mrp: result.mrp,
                category: result.category,
                shelfNumber: 'A1',
                imageDataUri: productPhoto,
                lastUpdated: new Date().toISOString()
            }, id);
            
            await trackUsage();
            toast({ title: "Bill Matched!", description: `Added ${result.quantity} units of ${result.productName}` });
            setIsBillIntakeOpen(false);
            setBillPhoto(null);
            setProductPhoto(null);
            loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: "Bill Analysis Failed" });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const handleTextCommand = async (text: string) => {
        if (!text.trim()) return;
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
                        id,
                        storeId: partnerId,
                        name: item.productName,
                        quantity: item.quantity,
                        mrp: 0,
                        wholesalePrice: 0,
                        category: 'General',
                        shelfNumber: 'A1',
                        imageDataUri: 'https://picsum.photos/seed/voice/200/200',
                        lastUpdated: new Date().toISOString()
                    }, id);
                }
            }
            await trackUsage();
            toast({ title: "AI Voice Sync", description: result.summary });
            loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: "Voice Parse Failed" });
        } finally {
            setIsAnalyzing(false);
        }
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
        (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const shelfGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        inventory.forEach(item => {
            const s = item.shelfNumber || 'Unassigned';
            if (!groups[s]) groups[s] = [];
            groups[s].push(item);
        });
        return groups;
    }, [inventory]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-900 text-white p-4 md:px-8 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Zap className="h-6 w-6 text-white" /></div>
                    <div><h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">{partner?.storeName || 'SnapStock AI'}</h1><p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">SaaS Partner Portal</p></div>
                </div>
                <div className="flex items-center gap-4">
                     <Badge variant="outline" className="text-blue-400 border-blue-400/30 uppercase text-[9px] font-black h-6">Snap Usage: {partner?.snapUsage || 0}</Badge>
                     <Button variant="ghost" size="sm" onClick={() => router.push('/snapstock/login')} className="text-slate-400 hover:text-white uppercase font-black text-[10px]">Logout</Button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full pb-32">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-blue-600 hover:bg-blue-500">
                        <Scan className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Scan to Sell</span>
                    </Button>
                    <Button onClick={() => document.getElementById('snap-intake-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-blue-200 text-blue-600" disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin h-8 w-8" /> : <Layers className="h-8 w-8" />}
                        <span className="font-bold uppercase text-xs">Bulk Snap Intake</span>
                    </Button>
                    <Button onClick={() => setIsBillIntakeOpen(true)} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg bg-white border-2 border-dashed border-indigo-200 text-indigo-600">
                        <FileUp className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Bill Intake (AI)</span>
                    </Button>
                    <Button variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-slate-100 bg-white" onClick={() => {
                        const sr = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                        if(sr) { const r = new sr(); r.onresult = (e:any) => handleTextCommand(e.results[0][0].transcript); r.start(); }
                    }}>
                        <Mic className="h-8 w-8 text-indigo-500" />
                        <span className="font-bold uppercase text-xs text-slate-500">Voice Command</span>
                    </Button>
                    <Card className="h-24 rounded-[24px] shadow-sm border-none bg-white p-4 flex flex-col justify-center text-center">
                         <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Stock Value</p>
                         <p className="text-2xl font-black italic">₹{inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0).toLocaleString()}</p>
                    </Card>
                </div>

                <input type="file" id="snap-intake-input" accept="image/*" capture="environment" className="hidden" onChange={handleBulkIntake} />

                <div className="flex flex-col md:flex-row gap-4 px-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search inventory or location..." className="pl-9 h-12 rounded-xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex bg-white rounded-full p-1 border shadow-sm">
                        <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List View</Button>
                        <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="h-8 px-4 rounded-full text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Shop Map</Button>
                    </div>
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden border-none shadow-sm bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8">Article & ID</TableHead><TableHead>Loc</TableHead><TableHead>Price (₹)</TableHead><TableHead>Quantity</TableHead><TableHead className="text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="pl-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-12 h-12 rounded-xl overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                <div><p className="font-black uppercase italic text-sm text-slate-800">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                            </div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline" className="text-[9px] font-bold uppercase">{item.shelfNumber}</Badge></TableCell>
                                        <TableCell><div className="font-black text-blue-600">₹{item.mrp}</div><div className="text-[8px] opacity-30">Cost: ₹{item.wholesalePrice}</div></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => updateItemQty(item.id, -1)}><Minus className="h-4 w-4" /></Button>
                                                <span className={cn("font-black text-xl", item.quantity < 5 ? "text-red-500" : "text-slate-700")}>{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500" onClick={() => updateItemQty(item.id, 1)}><Plus className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8"><Button variant="ghost" size="icon" className="text-slate-200 hover:text-red-500" onClick={() => deleteDocument('inventory', item.id).then(loadData)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        {Object.entries(shelfGroups).map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group hover:shadow-2xl transition-all">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4 px-6">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 text-blue-600 rounded-xl font-black italic"><MapPin className="h-4 w-4" /></div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Stock: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={cn("h-full transition-all duration-1000", items.length > 5 ? "bg-red-500" : "bg-blue-500")} style={{ width: `${Math.min(100, (items.length / 10) * 100)}%` }}></div>
                                    </div>
                                    {items.slice(0, 3).map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized />
                                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black uppercase italic truncate">{item.name}</p><p className="text-[8px] font-bold text-blue-500">₹{item.mrp}</p></div>
                                        </div>
                                    ))}
                                    {items.length > 3 && <p className="text-center text-[8px] font-black uppercase text-slate-400">+ {items.length - 3} more items</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* BILL INTAKE DIALOG */}
            <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">AI Bill Intake</DialogTitle><DialogDescription>Upload your supplier bill and the product photo to sync wholesale costs.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">1. Supplier Bill</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-upload')?.click()}>
                                {billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}
                            </div>
                            <input type="file" id="bill-upload" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">2. Product Photo</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('product-upload')?.click()}>
                                {productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Product</span></>}
                            </div>
                            <input type="file" id="product-upload" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-blue-600" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>
                            {isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Match & Sync to Stock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Confirm Sale</DialogTitle></DialogHeader>
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
                            <Button className="w-full h-14 rounded-2xl font-black uppercase italic text-lg bg-blue-600" onClick={async () => {
                                await updateItemQty(selectedSaleItem.id, -saleQty);
                                setSelectedSaleItem(null);
                                toast({ title: "Sale Recorded!" });
                            }}>Process Sale</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
