
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
    ShoppingCart, ShieldCheck, ArrowRight,
    MessageSquare, History, TrendingUp, 
    Sparkles, Send, Mic, Trash2, AlertTriangle,
    X, PackagePlus, Info, ImagePlus, QrCode, Printer, Calendar as CalendarIcon,
    Layers, Scan, Map as MapIcon, LayoutGrid, List
} from 'lucide-react';
import { getCollection, saveDocument, addDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { cn } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
    // Scan/Search States
    const [isQrSearching, setIsQrSearching] = useState(false);
    
    // AI Interaction States
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [textCommand, setTextCommand] = useState('');
    const [detectedIntakeItems, setDetectedIntakeItems] = useState<{productName: string, qty: number, category: string, imageDataUri?: string}[]>([]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const stock = await getCollection<InventoryItem>('inventory');
            // Sort: Newest Added First
            const sorted = (stock || []).sort((a, b) => {
                const dateA = new Date(a.addedDate || 0).getTime();
                const dateB = new Date(b.addedDate || 0).getTime();
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

    // Grouping for Shop Map
    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const shelf = item.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(item);
        });
        return groups;
    }, [inventory]);

    // QR Scanner Logic for Search
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
                    <title>Print Label - ${item.name}</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: sans-serif; display: flex; align-items: center; justify-content: center; }
                        .label { 
                            width: 80mm; 
                            height: 50mm; 
                            border: 2px solid black; 
                            padding: 10px; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center;
                            text-align: center;
                            box-sizing: border-box;
                        }
                        .title { font-weight: 900; font-size: 14px; text-transform: uppercase; margin-bottom: 5px; }
                        .content { display: flex; align-items: center; gap: 15px; width: 100%; }
                        .qr { width: 80px; height: 80px; }
                        .details { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
                        .price { font-weight: 900; font-size: 18px; }
                        .id { font-family: monospace; font-size: 10px; color: #666; }
                        .shelf { font-size: 10px; font-weight: bold; background: #eee; padding: 2px 5px; border-radius: 4px; margin-top: 5px; }
                        .watermark { font-size: 8px; text-transform: uppercase; opacity: 0.3; font-weight: bold; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="label">
                        <div class="title">${item.name}</div>
                        <div class="content">
                            <img src="${qrUrl}" class="qr" />
                            <div class="details">
                                <div class="price">₹${item.mrp}</div>
                                <div class="id">${item.id}</div>
                                <div class="shelf">LOC: ${item.shelfNumber}</div>
                            </div>
                        </div>
                        <div class="watermark">Snazzify Secure Inventory System</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() { window.close(); };
                        };
                    </script>
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
        } catch (e) {
            return false;
        }
    };

    const handleCreateAndRecord = async (productName: string, qty: number, type: MovementType, category: string, imageDataUri?: string) => {
        const shortId = uuidv4().substring(0, 8).toUpperCase();
        const now = new Date().toISOString();
        const newItem: InventoryItem = {
            id: shortId, 
            name: productName, 
            quantity: Math.max(0, qty), 
            wholesalePrice: 0, 
            mrp: 0, 
            shelfNumber: 'NEW', 
            imageDataUri: imageDataUri || `https://picsum.photos/seed/${shortId}/400/400`, 
            category: category || 'New Article', 
            lastUpdated: now, 
            addedDate: now, 
            purchaseDate: now
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

    const handleTextCommand = async (command: string) => {
        if (!command.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await parseInventoryCommand(command);
            setDetectedIntakeItems(result.items.map(i => ({ productName: i.productName, qty: i.quantity, category: 'General' })));
            setTextCommand('');
            setIsListening(false);
            toast({ title: "AI Detected Movement", description: result.summary });
        } catch (e) {
            toast({ variant: 'destructive', title: "Parsing Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleBulkIntakeCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'intake');
            
            if (detections.length === 0) {
                toast({ variant: 'destructive', title: "Detection Failed", description: "AI couldn't find distinct items." });
            } else {
                setDetectedIntakeItems(detections.map(d => ({
                    productName: d.productName,
                    qty: d.count,
                    category: d.category,
                    imageDataUri: uri
                })));
                toast({ title: "Items Segregated!", description: `AI detected ${detections.length} distinct products.` });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Intake Error" });
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    const handleNewProductCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const aiData = await analyzeInventoryItem({ imageDataUri: uri });
            const shortId = uuidv4().substring(0, 8).toUpperCase();
            const now = new Date().toISOString();
            const newItem: InventoryItem = {
                id: shortId, name: aiData.productName, quantity: 1, wholesalePrice: 0, mrp: aiData.suggestedMRP, shelfNumber: 'PENDING', imageDataUri: uri, category: aiData.category, lastUpdated: now, addedDate: now, purchaseDate: now, description: aiData.description, sellingPoints: aiData.sellingPoints,
            };
            await saveDocument('inventory', newItem, shortId);
            setInventory(prev => [newItem, ...prev]);
            toast({ title: "New Product Listed!", description: `AI added: ${aiData.productName}` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Identification Failed" });
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    const handleImageUpdate = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsAnalyzing(true);
            try {
                const uri = await resizeImage(file);
                const item = inventory.find(i => i.id === id);
                if (item) {
                    const updatedItem = { ...item, imageDataUri: uri, lastUpdated: new Date().toISOString() };
                    await saveDocument('inventory', updatedItem, id);
                    setInventory(prev => prev.map(i => i.id === id ? updatedItem : i));
                    toast({ title: "Photo Updated!" });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: "Update Failed" });
            } finally {
                setIsAnalyzing(false);
                e.target.value = '';
            }
        }
    };

    const finalizeBulkIntake = async () => {
        setIsAnalyzing(true);
        let successCount = 0;
        for (const intake of detectedIntakeItems) {
            const item = inventory.find(i => 
                i.name.toLowerCase() === intake.productName.toLowerCase() || 
                i.name.toLowerCase().includes(intake.productName.toLowerCase()) || 
                intake.productName.toLowerCase().includes(i.name.toLowerCase())
            );
            
            if (item) {
                const type = intake.qty > 0 ? 'Purchase' : 'Sale';
                const ok = await recordMovement(item, intake.qty, type as MovementType, "Bulk Intake Sync");
                if (ok) successCount++;
            } else if (intake.qty > 0) {
                const ok = await handleCreateAndRecord(intake.productName, intake.qty, 'Bulk Intake', intake.category, intake.imageDataUri);
                if (ok) successCount++;
            }
        }
        toast({ title: successCount > 0 ? "Inventory Synced" : "No Changes", description: `Processed ${successCount} items.` });
        setDetectedIntakeItems([]);
        setIsAnalyzing(false);
    };

    const startVoiceCapture = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast({ variant: 'destructive', title: "Speech Not Supported" });
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.onstart = () => { setIsListening(true); setVoiceTranscript('Listening...'); };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setVoiceTranscript(transcript);
            handleTextCommand(transcript);
        };
        recognition.onerror = () => { setIsListening(false); toast({ variant: 'destructive', title: "Speech Error" }); };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const filteredInventory = inventory.filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <AppShell title="Shop Intelligence Hub">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Intake Actions</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex flex-col gap-2">
                                <Button size="sm" variant="secondary" className="w-full rounded-xl" onClick={() => document.getElementById('bulk-intake-capture')?.click()}>
                                    {isAnalyzing ? <Loader2 className="animate-spin h-4 w-4" /> : <Layers className="h-4 w-4 mr-2" />} Bulk Intake (Photo)
                                </Button>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={startVoiceCapture}><Mic className="h-3 w-3 mr-1" /> Voice</Button>
                                    <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => document.getElementById('new-item-capture')?.click()}><Plus className="h-3 w-3 mr-1" /> New</Button>
                                </div>
                             </div>
                             <input type="file" id="bulk-intake-capture" accept="image/*" className="hidden" onChange={handleBulkIntakeCapture} />
                             <input type="file" id="new-item-capture" accept="image/*" className="hidden" onChange={handleNewProductCapture} />
                        </CardContent>
                    </Card>

                    <Link href="/admin/inventory/audit">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Visual Audit</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div>
                                <div className="text-xl font-bold">Shelf Check</div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/inventory/billing">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Point of Sale</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart className="h-5 w-5" /></div>
                                <div className="text-xl font-bold">New Bill</div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card className="bg-slate-900 text-white shadow-xl border-none">
                         <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total SKUs</CardTitle></CardHeader>
                         <CardContent><div className="text-3xl font-black">{inventory.length}</div></CardContent>
                    </Card>

                    <Card className="bg-slate-50 shadow-inner border-none flex flex-col justify-center p-4">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Navigation Mode</p>
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}><List className="h-3 w-3 mr-1" /> List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}><MapIcon className="h-3 w-3 mr-1" /> Map</Button>
                        </div>
                    </Card>
                </div>

                <div className="flex gap-4">
                    <Card className="flex-1 rounded-[28px] shadow-sm border-none bg-white p-2 flex items-center">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl ml-2"><MessageSquare className="h-6 w-6" /></div>
                        <Input 
                            placeholder="Type command: 'Sold 2 rosaries' or 'Add 5 candles'..." 
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
                            <Input placeholder="Search items or Shelf..." className="pl-9 h-12 w-64 rounded-2xl bg-white shadow-sm" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl shadow-sm bg-white" onClick={() => setIsQrSearching(true)}>
                            <Scan className="h-5 w-5 text-primary" />
                        </Button>
                    </div>
                </div>

                {detectedIntakeItems.length > 0 && (
                    <Card className="border-2 border-primary bg-primary/5 rounded-[32px] animate-in fade-in slide-in-from-top-4">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2 italic font-black"><Sparkles className="text-primary"/> Confirm AI Intake</CardTitle></CardHeader>
                        <CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {detectedIntakeItems.map((item, idx) => {
                                const match = inventory.find(i => i.name.toLowerCase() === item.productName.toLowerCase() || i.name.toLowerCase().includes(item.productName.toLowerCase()));
                                return (
                                    <div key={idx} className={cn("p-4 bg-white rounded-2xl border flex items-center justify-between", !match && "border-amber-200 bg-amber-50/50")}>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={item.qty < 0 ? 'destructive' : 'default'} className="rounded-full h-8 w-8 p-0 flex items-center justify-center font-bold">{item.qty > 0 ? '+' : ''}{item.qty}</Badge>
                                            <div>
                                                <span className="font-bold uppercase text-xs block">{item.productName}</span>
                                                <span className="text-[9px] text-muted-foreground uppercase">{item.category}</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setDetectedIntakeItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                    </div>
                                );
                            })}
                        </div></CardContent>
                        <CardFooter className="gap-2"><Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setDetectedIntakeItems([])}>Discard</Button><Button className="flex-1 rounded-2xl h-12 text-lg font-black" onClick={finalizeBulkIntake} disabled={isAnalyzing}>Process AI Intake</Button></CardFooter>
                    </Card>
                )}

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Shelf Location</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>In Stock</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50 cursor-pointer group" onClick={() => document.getElementById(`img-update-${item.id}`)?.click()}>
                                                        <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-4 w-4 text-white" /></div>
                                                        <input type="file" id={`img-update-${item.id}`} className="hidden" accept="image/*" onChange={(e) => handleImageUpdate(item.id, e)} />
                                                    </div>
                                                    <div>
                                                        <Link href={`/admin/inventory/${item.id}/timeline`} className="font-bold hover:underline hover:text-primary transition-colors uppercase italic">{item.name}</Link>
                                                        <p className="text-[9px] text-muted-foreground font-mono tracking-widest">{item.category}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <LayoutGrid className="h-3 w-3 text-muted-foreground" />
                                                    <Input 
                                                        className="h-8 w-24 text-xs font-bold uppercase" 
                                                        value={item.shelfNumber} 
                                                        onChange={(e) => {
                                                            const newShelf = e.target.value.toUpperCase();
                                                            setInventory(prev => prev.map(i => i.id === item.id ? { ...i, shelfNumber: newShelf } : i));
                                                            saveDocument('inventory', { shelfNumber: newShelf }, item.id);
                                                        }} 
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1 text-[10px] text-muted-foreground font-medium">
                                                    <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-500" /> Bought: {item.purchaseDate ? format(new Date(item.purchaseDate), 'dd MMM') : 'N/A'}</div>
                                                    <div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3 text-blue-500" /> Added: {format(new Date(item.addedDate || item.lastUpdated), 'dd MMM')}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell><div className="font-black text-slate-800">₹{item.mrp}</div></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500" onClick={() => recordMovement(item, -1, 'Sale')}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-lg", item.quantity < 5 ? "text-red-500 animate-pulse" : "text-slate-700")}>{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-green-50 text-green-500" onClick={() => recordMovement(item, 1, 'Purchase')}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] uppercase font-bold" onClick={() => handlePrintLabel(item)}><Printer className="h-3 w-3 mr-1" /> Label</Button>
                                                <Dialog>
                                                    <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] uppercase font-bold text-destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Loss</Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Report Damage / Loss: {item.name}</DialogTitle></DialogHeader>
                                                        <div className="py-4 space-y-4">
                                                            <div className="space-y-2"><Label>Quantity Lost</Label><Input type="number" id={`qty-loss-${item.id}`} defaultValue={1} /></div>
                                                            <div className="space-y-2"><Label>Reason</Label>
                                                                <Select defaultValue="Damage" onValueChange={(val) => { const el = document.getElementById(`reason-loss-${item.id}`); if(el) (el as any).value = val; }}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent><SelectItem value="Damage">Damage / Broken</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="Missing">Missing / Theft</SelectItem></SelectContent>
                                                                </Select>
                                                                <input type="hidden" id={`reason-loss-${item.id}`} value="Damage" />
                                                            </div>
                                                        </div>
                                                        <DialogFooter><DialogClose asChild><Button variant="destructive" className="w-full h-12 font-bold rounded-2xl" onClick={async () => {
                                                            const qty = parseInt((document.getElementById(`qty-loss-${item.id}`) as HTMLInputElement).value) || 0;
                                                            const reason = (document.getElementById(`reason-loss-${item.id}`) as HTMLInputElement).value || 'Damage';
                                                            await recordMovement(item, -qty, 'Damage', reason);
                                                        }}>Record Loss & Update Stock</Button></DialogClose></DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
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
                                            <CardDescription className="text-[10px] uppercase font-bold">{items.length} Products Hosted</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Total Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        {items.slice(0, 3).map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                                <Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black uppercase italic truncate">{item.name}</p>
                                                    <p className="text-[9px] font-bold text-primary">In Stock: {item.quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {items.length > 3 && <p className="text-center text-[10px] font-bold text-muted-foreground uppercase py-2">+{items.length - 3} more items on this shelf</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isQrSearching} onOpenChange={setIsQrSearching}>
                <DialogContent className="max-w-sm rounded-[32px] p-6 border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-xl font-black uppercase italic tracking-widest text-primary text-center">QR Search Scanner</DialogTitle></DialogHeader>
                    <div id="qr-search-reader" className="w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-slate-100 min-h-[300px] flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">Initializing scanner...</p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isListening} onOpenChange={setIsListening}>
                <DialogContent className="max-w-sm rounded-[32px] p-8 text-center border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-xl font-black uppercase italic tracking-widest text-primary">Listening Mode</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-6">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse"><Mic className="h-10 w-10 text-primary" /></div>
                        <p className="text-sm font-bold text-slate-600">"{voiceTranscript || 'Say: Sold 2 Rosaries'}"</p>
                    </div>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
