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
    X, PackagePlus, ImagePlus, Scan, Map as MapIcon, List, CheckCircle2,
    Sun, Moon, Download, Printer, LayoutGrid, Layers, MessageSquare,
    FileText, FileCheck, FileUp, Zap
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
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

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const stock = await getCollection<InventoryItem>('inventory');
            const sorted = (stock || []).sort((a, b) => {
                const dateA = new Date(a.addedDate || a.lastUpdated || 0).getTime();
                const dateB = new Date(b.addedDate || b.lastUpdated || 0).getTime();
                return dateB - dateA;
            });
            setInventory(sorted);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Load Failed' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        setIsMounted(true);
        loadData();
    }, [loadData]);

    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const shelf = item.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(item);
        });
        return groups;
    }, [inventory]);

    useEffect(() => {
        if (!isQrSearching) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("qr-search-reader", { fps: 10, qrbox: 250 }, false);
            scanner.render((decodedText) => {
                setSearchQuery(decodedText);
                setIsQrSearching(false);
                scanner.clear();
                toast({ title: "Product Found", description: `Searching for: ${decodedText}` });
            }, (err) => {});
            return () => { scanner.clear().catch(() => {}); };
        }, 100);
        return () => clearTimeout(timer);
    }, [isQrSearching, toast]);

    const handlePrintLabel = (item: InventoryItem) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.id}`;
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Label - ${item.name}</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }
                        .label { 
                            width: 80mm; height: 50mm; border: 2px solid black; padding: 10px; 
                            display: flex; flex-direction: column; align-items: center; 
                            justify-content: center; text-align: center; box-sizing: border-box;
                        }
                        .title { font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
                        .content { display: flex; align-items: center; gap: 15px; width: 100%; }
                        .qr { width: 80px; height: 80px; }
                        .details { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
                        .price { font-weight: 900; font-size: 18px; }
                        .shelf { font-size: 10px; font-weight: bold; background: #eee; padding: 2px 5px; border-radius: 4px; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="title">${item.name}</div>
                        <div class="content">
                            <img src="${qrUrl}" class="qr" />
                            <div class="details">
                                <div class="price">₹${item.mrp}</div>
                                <div class="shelf">LOC: ${item.shelfNumber}</div>
                            </div>
                        </div>
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); };</script>
                </body>
            </html>
        `);
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

    const recordMovement = async (item: InventoryItem, qty: number, type: MovementType, note?: string) => {
        const now = new Date().toISOString();
        const newQty = item.quantity + qty;
        const movement: StockMovement = {
            id: uuidv4(), productId: item.id, type, quantity: qty, date: now, note, previousStock: item.quantity, newStock: newQty
        };
        try {
            setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, lastUpdated: now } : i));
            await Promise.all([
                saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: now }, item.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            return true;
        } catch (e) { return false; }
    };

    const handleCreateAndRecord = async (productName: string, qty: number, mrp: number, purchasePrice: number, type: MovementType, category: string, imageDataUri?: string) => {
        const shortId = uuidv4().substring(0, 8).toUpperCase();
        const now = new Date().toISOString();
        const newItem: InventoryItem = {
            id: shortId, name: productName, quantity: Math.max(0, qty), wholesalePrice: purchasePrice || 0, mrp: mrp || 0, shelfNumber: 'NEW', 
            imageDataUri: imageDataUri || `https://picsum.photos/seed/${shortId}/400/400`, category: category || 'New Article', 
            lastUpdated: now, addedDate: now, purchaseDate: now
        };
        const movement: StockMovement = {
            id: uuidv4(), productId: shortId, type: 'Opening', quantity: Math.max(0, qty), date: now, note: "AI Auto-created during Intake", previousStock: 0, newStock: Math.max(0, qty)
        };
        try {
            await Promise.all([saveDocument('inventory', newItem, shortId), saveDocument('inventory_movements', movement, movement.id)]);
            setInventory(prev => [newItem, ...prev]);
            return true;
        } catch (e) { return false; }
    };

    const handleBulkIntakeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            if (detections.length === 0) {
                toast({ variant: 'destructive', title: "Detection Failed" });
            } else {
                const segregatedItems = [];
                for (const d of detections) {
                    let itemImage = uri;
                    if (d.box_2d) {
                        itemImage = await cropImage(uri, d.box_2d);
                    }
                    segregatedItems.push({
                        productName: d.productName, qty: d.count, mrp: 0, purchasePrice: 0, category: d.category, imageDataUri: itemImage, needsCleanShot: d.box_2d ? false : true 
                    });
                }
                setDetectedIntakeItems(segregatedItems);
                toast({ title: "SnapStock Segregation Complete!" });
            }
        } catch (e) { toast({ variant: 'destructive', title: "Intake Error" }); }
        finally { setIsAnalyzing(false); e.target.value = ''; }
    };

    const handleBroadcastReport = (type: 'morning' | 'night') => {
        const lowStock = inventory.filter(i => i.quantity < 5);
        const totalValue = inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0);
        let message = `📦 *SNAPSTOCK REPORT: ${type.toUpperCase()}*\n\n`;
        let excelData: any[] = [];
        
        if (type === 'morning') {
            message += `🌞 *Morning Readiness*\n- Low Stock: ${lowStock.length} SKUs\n- Store Value: ₹${totalValue.toLocaleString()}\n\n*Reorder:*\n${lowStock.map(i => `- ${i.name} (${i.quantity})`).join('\n')}`;
            excelData = lowStock.map(i => ({ Product: i.name, Qty: i.quantity, MRP: i.mrp, Wholesale: i.wholesalePrice }));
        } else {
            message += `🌙 *Closing Summary*\n- Total SKUs: ${inventory.length}\n- Closing Value: ₹${totalValue.toLocaleString()}\n- Shelves: ${Object.keys(shelfGroups).length}`;
            excelData = inventory.map(i => ({ Product: i.name, Qty: i.quantity, MRP: i.mrp, Wholesale: i.wholesalePrice, Value: i.quantity * i.mrp }));
        }
        
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

    const updateItemFields = (id: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates, lastUpdated: new Date().toISOString() } : i));
        saveDocument('inventory', updates, id);
    };

    const handleDeleteItem = async (id: string) => {
        try {
            await deleteDocument('inventory', id);
            setInventory(prev => prev.filter(i => i.id !== id));
            toast({ title: "Deleted" });
        } catch (e) { toast({ variant: 'destructive', title: "Delete Failed" }); }
    };

    const handleBillIntake = async () => {
        if (!billPhoto || !productPhoto) return;
        setIsProcessingBill(true);
        try {
            const result = await matchProductToBill(billPhoto, productPhoto);
            setDetectedIntakeItems([{
                productName: result.productName,
                qty: result.quantity,
                mrp: result.mrp,
                purchasePrice: result.wholesalePrice,
                category: result.category,
                imageDataUri: productPhoto,
                needsCleanShot: false
            }]);
            toast({ title: "Bill Matched Successfully!" });
            setIsBillIntakeOpen(false);
            setBillPhoto(null);
            setProductPhoto(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Bill Error', description: error.message });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const filteredInventory = inventory.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.id || '').toLowerCase().includes(searchTerm.toLowerCase()) || (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase()));

    if (!isMounted) return null;

    return (
        <AppShell title="SnapStock AI Dashboard">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Stock Actions</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Button size="sm" variant="secondary" className="w-full rounded-xl" onClick={() => document.getElementById('bulk-intake-capture')?.click()}>
                                {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : <Layers className="h-4 w-4 mr-2" />} Bulk Intake (Photo)
                             </Button>
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => { const sr = (window as any).SpeechRecognition || (window as any).webkitRecognition; if(!sr) return; const r = new sr(); r.onstart = () => {}; r.onresult = (e: any) => handleTextCommand(e.results[0][0].transcript); r.onend = () => {}; r.start(); }}><Mic className="h-3 w-3 mr-1" /> Voice</Button>
                                <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="secondary" className="flex-1 rounded-xl"><FileText className="h-3 w-3 mr-1" /> Bill</Button>
                                    </DialogTrigger>
                                    <DialogContent className="rounded-[32px]">
                                        <DialogHeader>
                                            <DialogTitle className="font-black italic uppercase">SnapStock Bill Matching</DialogTitle>
                                            <DialogDescription>Identify items from supplier bills automatically.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-4 py-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase">1. Supplier Bill</Label>
                                                <div className="relative aspect-square border-2 border-dashed rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer" onClick={() => document.getElementById('bill-cam')?.click()}>
                                                    {billPhoto ? <Image src={billPhoto} fill alt="bill" className="object-cover" /> : <FileUp className="h-8 w-8 text-slate-300" />}
                                                </div>
                                                <input id="bill-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase">2. Product Photo</Label>
                                                <div className="relative aspect-square border-2 border-dashed rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer" onClick={() => document.getElementById('prod-cam')?.click()}>
                                                    {productPhoto ? <Image src={productPhoto} fill alt="prod" className="object-cover" /> : <Camera className="h-8 w-8 text-slate-300" />}
                                                </div>
                                                <input id="prod-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button className="w-full h-12 rounded-2xl font-black uppercase italic" onClick={handleBillIntake} disabled={!billPhoto || !productPhoto || isProcessingBill}>
                                                {isProcessingBill ? <Loader2 className="animate-spin" /> : <FileCheck className="mr-2" />} Match bill to stock
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                             </div>
                             <input type="file" id="bulk-intake-capture" accept="image/*" capture="environment" className="hidden" onChange={handleBulkIntakeCapture} />
                        </CardContent>
                    </Card>

                    <Link href="/admin/inventory/audit" className="contents">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Visual Audit</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="text-xl font-bold italic">Shelf Check</div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card className="shadow-lg border-none bg-white h-full flex flex-col justify-center">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Broadcasts</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-2 pt-0">
                            <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 border-amber-100 text-amber-600" onClick={() => handleBroadcastReport('morning')}><Sun className="h-3 w-3 mr-1"/> MORNING</Button>
                            <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 border-indigo-100 text-indigo-600" onClick={() => handleBroadcastReport('night')}><Moon className="h-3 w-3 mr-1"/> NIGHT</Button>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 text-white shadow-xl border-none relative group overflow-hidden" onClick={handleExportFullInventory}>
                        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <Download className="h-8 w-8 text-primary" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total SKUs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black">{inventory.length}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 shadow-inner border-none flex flex-col justify-center p-4">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">View Mode</p>
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}><List className="h-3 w-3 mr-1" /> List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}><MapIcon className="h-3 w-3 mr-1" /> Map</Button>
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <Card className="flex-1 rounded-[28px] shadow-sm border-none bg-white p-2 flex items-center">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl ml-2">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <Input 
                            placeholder="Type: 'Sold 2 rosaries' or 'Add 5 candles'..." 
                            className="flex-1 border-none focus-visible:ring-0 text-sm font-medium" 
                            value={textCommand} 
                            onChange={e => setTextCommand(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleTextCommand(textCommand)}
                        />
                        <Button onClick={() => handleTextCommand(textCommand)} disabled={!textCommand || isAnalyzing} className="rounded-2xl mr-2">
                            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </Card>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search shelf..." className="pl-9 h-12 w-full md:w-64 rounded-2xl bg-white shadow-sm" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl shadow-sm bg-white" onClick={() => setIsQrSearching(true)}>
                            <Scan className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                </div>

                {detectedIntakeItems.length > 0 && (
                    <Card className="border-2 border-primary bg-primary/5 rounded-[32px] animate-in fade-in slide-in-from-top-4">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 italic font-black">
                                <Sparkles className="text-primary"/> Confirm SnapStock Segregation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {detectedIntakeItems.map((item, idx) => (
                                    <Card key={idx} className="p-4 bg-white rounded-2xl border-none shadow-sm flex flex-col gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-24 w-24 rounded-xl overflow-hidden border bg-slate-50 group cursor-pointer" onClick={() => document.getElementById(`indiv-photo-${idx}`)?.click()}>
                                                {item.imageDataUri && <Image src={item.imageDataUri} fill alt="p" className="object-contain p-1" unoptimized />}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="text-white h-6 w-6"/></div>
                                                <input type="file" id={`indiv-photo-${idx}`} className="hidden" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; if(file) { const uri = await resizeImage(file); setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, imageDataUri: uri } : it)); } }} />
                                            </div>
                                            <div className="flex-1 min-w-0"><Input value={item.productName} onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, productName: e.target.value } : it))} className="h-8 text-xs font-black uppercase italic p-0 bg-transparent border-none" /><Badge variant="outline" className="text-[8px] mt-1">NEW SKU</Badge></div>
                                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={() => setDetectedIntakeItems(prev => prev.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">Qty</Label><div className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: it.qty - 1 } : it))}><Minus className="h-3 w-3" /></Button><span className="text-xs font-black">{item.qty}</span><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: it.qty + 1 } : it))}><Plus className="h-3 w-3" /></Button></div></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">Cost</Label><Input type="number" value={item.purchasePrice} onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, purchasePrice: Number(e.target.value) } : it))} className="h-8 text-xs font-bold text-amber-600" /></div>
                                            <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-400">MRP</Label><Input type="number" value={item.mrp} onChange={e => setDetectedIntakeItems(prev => prev.map((it, i) => i === idx ? { ...it, mrp: Number(e.target.value) } : it))} className="h-8 text-xs font-bold text-primary" /></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="gap-3">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setDetectedIntakeItems([])}>Discard</Button>
                            <Button className="flex-2 h-14 rounded-2xl text-lg font-black uppercase italic" onClick={async () => { setIsAnalyzing(true); for(const item of detectedIntakeItems) { await handleCreateAndRecord(item.productName, item.qty, item.mrp, item.purchasePrice, 'Bulk Intake', item.category, item.imageDataUri); } setDetectedIntakeItems([]); setIsAnalyzing(false); toast({ title: "SnapStock Inventory Synced" }); }} disabled={isAnalyzing}>Commit to Stock</Button>
                        </CardFooter>
                    </Card>
                )}

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Prices (₹)</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50 cursor-pointer group" onClick={() => document.getElementById(`img-up-${item.id}`)?.click()}>
                                                        <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-4 w-4 text-white" /></div>
                                                        <input type="file" id={`img-up-${item.id}`} className="hidden" accept="image/*" capture="environment" onChange={async (e) => { const f = e.target.files?.[0]; if(f) updateItemFields(item.id, { imageDataUri: await resizeImage(f) }); }} />
                                                    </div>
                                                    <div>
                                                        <Link href={`/admin/inventory/${item.id}/timeline`} className="font-bold hover:underline italic uppercase">{item.name}</Link>
                                                        <p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <MapIcon className="h-3 w-3 opacity-30" />
                                                    <Input className="h-8 w-24 text-xs font-bold uppercase border-none bg-slate-50" value={item.shelfNumber} onChange={(e) => updateItemFields(item.id, { shelfNumber: e.target.value.toUpperCase() })} />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] font-black opacity-30">BUY:</span>
                                                        <Input type="number" className="h-7 w-20 text-xs text-amber-600 bg-amber-50 border-none" value={item.wholesalePrice} onChange={(e) => updateItemFields(item.id, { wholesalePrice: Number(e.target.value) })} />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[8px] font-black opacity-30">SELL:</span>
                                                        <Input type="number" className="h-7 w-20 text-xs font-black text-primary bg-primary/5 border-none" value={item.mrp} onChange={(e) => updateItemFields(item.id, { mrp: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => recordMovement(item, -1, 'Sale')}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-lg", item.quantity < 5 && "text-red-500")}>{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => recordMovement(item, 1, 'Purchase')}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold" onClick={() => handlePrintLabel(item)}><Printer className="h-3 w-3 mr-1" /> Label</Button>
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold text-destructive" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(shelfGroups).sort().map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden group hover:shadow-2xl transition-all">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-xl text-primary font-black italic">{shelf}</div>
                                        <div>
                                            <CardTitle className="text-sm font-black uppercase italic">Shelf Profile</CardTitle>
                                            <CardDescription className="text-[10px] uppercase font-bold">{items.length} SKUs</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {items.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                                <Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black uppercase italic truncate">{item.name}</p>
                                                    <p className="text-[9px] font-bold text-primary">₹{item.mrp}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
            {isQrSearching && (
                <div id="qr-search-reader" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="bg-white p-6 rounded-[32px] w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Scan Product QR</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsQrSearching(false)}><X /></Button>
                        </div>
                        <div id="qr-search-reader-container" className="rounded-xl overflow-hidden aspect-square"></div>
                     </div>
                </div>
            )}
        </AppShell>
    );
}
