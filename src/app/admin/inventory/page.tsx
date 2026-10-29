
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Layers
} from 'lucide-react';
import { getCollection, saveDocument, addDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { cn, sanitizePhoneNumber } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

const MAX_IMAGE_SIZE_PX = 600;

// Printable Label Component
const ProductLabel = ({ item }: { item: InventoryItem }) => {
    return (
        <div className="p-6 bg-white border-2 border-black w-[80mm] h-[50mm] flex flex-col items-center justify-center gap-2 text-black print:m-0">
            <h4 className="font-black uppercase text-center text-sm leading-tight line-clamp-2">{item.name}</h4>
            <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 border border-slate-200">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.id}`} 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="font-black text-lg">₹{item.mrp}</p>
                    <p className="text-[8px] font-mono font-bold uppercase">{item.id}</p>
                    <p className="text-[8px] font-bold opacity-50 uppercase tracking-tighter">Snazzify Secure</p>
                </div>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-widest">{item.category}</p>
        </div>
    );
};

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    
    // QR Print State
    const [printItem, setPrintItem] = useState<InventoryItem | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `Label_${printItem?.name || 'product'}`,
    });

    // Effect to trigger print after state is set and content is rendered
    useEffect(() => {
        if (printItem && printRef.current) {
            handlePrint();
            setPrintItem(null);
        }
    }, [printItem, handlePrint]);

    // AI Interaction States
    const [isListening, setIsListening] = useState(false);
    const [voiceTranscript, setVoiceTranscript] = useState('');
    const [isVisionProcessing, setIsVisionProcessing] = useState(false);
    const [textCommand, setTextCommand] = useState('');
    const [detectedSaleItems, setDetectedSaleItems] = useState<{productName: string, qty: number}[]>([]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const stock = await getCollection<InventoryItem>('inventory');
            // Sort by addedDate or lastUpdated descending so new products appear on top
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
            id: uuidv4(),
            productId: item.id,
            type,
            quantity: qty,
            date: now,
            note,
            previousStock: item.quantity,
            newStock: newQty
        };

        try {
            // Update local state first for instant UI response
            setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, lastUpdated: now } : i));

            // Sync with database
            await Promise.all([
                saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: now }, item.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            
            return true;
        } catch (e) {
            console.error("Stock update error:", e);
            return false;
        }
    };

    const handleCreateAndRecord = async (productName: string, qty: number, type: MovementType, note?: string) => {
        const shortId = uuidv4().substring(0, 8).toUpperCase();
        const now = new Date().toISOString();
        const newItem: InventoryItem = {
            id: shortId,
            name: productName,
            quantity: Math.max(0, qty),
            wholesalePrice: 0,
            mrp: 0,
            shelfNumber: 'New',
            imageDataUri: `https://picsum.photos/seed/${shortId}/400/400`, // Placeholder
            category: 'New Article',
            lastUpdated: now,
            addedDate: now,
            purchaseDate: now,
            description: 'Auto-added via AI command.',
        };

        const movement: StockMovement = {
            id: uuidv4(),
            productId: newItem.id,
            type: 'Opening',
            quantity: Math.max(0, qty),
            date: now,
            note: note || "AI Auto-created",
            previousStock: 0,
            newStock: Math.max(0, qty)
        };

        try {
            await Promise.all([
                saveDocument('inventory', newItem, newItem.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            setInventory(prev => [newItem, ...prev]);
            return true;
        } catch (e) {
            console.error("Creation error:", e);
            return false;
        }
    };

    const handleTextCommand = async (command: string) => {
        if (!command.trim()) return;
        setIsAnalyzing(true);
        try {
            const result = await parseInventoryCommand(command);
            setDetectedSaleItems(result.items.map(i => ({ productName: i.productName, qty: i.quantity })));
            setTextCommand('');
            setIsListening(false);
            toast({ title: "AI Detected Items", description: result.summary });
        } catch (e) {
            toast({ variant: 'destructive', title: "Parsing Failed" });
        } finally {
            setIsAnalyzing(false);
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
                id: shortId,
                name: aiData.productName,
                quantity: 1,
                wholesalePrice: 0,
                mrp: aiData.suggestedMRP,
                shelfNumber: 'Pending',
                imageDataUri: uri,
                category: aiData.category,
                lastUpdated: now,
                addedDate: now,
                purchaseDate: now,
                description: aiData.description,
                sellingPoints: aiData.sellingPoints,
            };

            await saveDocument('inventory', newItem, newItem.id);
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

    const handlePhotoSale = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsVisionProcessing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'sale');
            if (!detections || detections.length === 0) {
                toast({ variant: 'destructive', title: "No items detected" });
            } else {
                setDetectedSaleItems(detections.map(d => ({ productName: d.productName, qty: -d.count })));
                toast({ title: "Photo Analyzed", description: `Found ${detections.length} types of items.` });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Vision Error" });
        } finally {
            setIsVisionProcessing(false);
            e.target.value = '';
        }
    };

    const finalizeBulkSale = async () => {
        setIsAnalyzing(true);
        let successCount = 0;
        
        for (const sale of detectedSaleItems) {
            const item = inventory.find(i => 
                i.name.toLowerCase() === sale.productName.toLowerCase() ||
                i.name.toLowerCase().includes(sale.productName.toLowerCase()) || 
                sale.productName.toLowerCase().includes(i.name.toLowerCase())
            );
            
            if (item) {
                const type = sale.qty < 0 ? 'Sale' : 'Purchase';
                const ok = await recordMovement(item, sale.qty, type as MovementType, "AI Automated Update");
                if (ok) successCount++;
            } else if (sale.qty > 0) {
                // Auto-create New Product from "Add" Command
                const ok = await handleCreateAndRecord(sale.productName, sale.qty, 'Purchase', "AI Auto-created from Command");
                if (ok) successCount++;
            }
        }
        
        toast({ 
            title: successCount > 0 ? "Stock Updated" : "No Changes Applied", 
            description: `Processed ${successCount} out of ${detectedSaleItems.length} commands.`,
            variant: successCount === 0 ? "destructive" : "default"
        });
        setDetectedSaleItems([]);
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
        recognition.onstart = () => {
            setIsListening(true);
            setVoiceTranscript('Listening...');
        };
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setVoiceTranscript(transcript);
            handleTextCommand(transcript);
        };
        recognition.onerror = () => {
            setIsListening(false);
            toast({ variant: 'destructive', title: "Speech Error" });
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const filteredInventory = inventory.filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <AppShell title="Shop Inventory">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Inventory Intelligence</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={startVoiceCapture}>
                                    <Mic className="h-4 w-4 mr-2" /> {isListening ? 'Listening...' : 'Voice'}
                                </Button>
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => document.getElementById('sale-photo')?.click()}>
                                    {isVisionProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4 mr-2" />} Photo
                                </Button>
                                <input type="file" id="sale-photo" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSale} />
                             </div>
                        </CardContent>
                    </Card>

                    <Button onClick={() => document.getElementById('new-item-capture')?.click()} variant="outline" className="h-full border-2 border-dashed border-primary/20 bg-white rounded-2xl flex flex-col gap-2 p-4 shadow-sm hover:bg-slate-50">
                        {isAnalyzing ? <Loader2 className="animate-spin text-primary" /> : <PackagePlus className="h-6 w-6 text-primary" />}
                        <span className="font-bold uppercase text-[10px]">Capture New Product</span>
                        <input type="file" id="new-item-capture" accept="image/*" className="hidden" onChange={handleNewProductCapture} />
                    </Button>

                    <Link href="/admin/inventory/audit">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Stock Audit Mode</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Layers className="h-5 w-5" /></div>
                                <div className="text-xl font-bold">Shelf Check</div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/admin/inventory/billing">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Billing Mode</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart className="h-5 w-5" /></div>
                                <div className="text-xl font-bold">New Invoice</div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card className="bg-slate-900 text-white shadow-xl border-none">
                         <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total SKUs</CardTitle></CardHeader>
                         <CardContent><div className="text-3xl font-black">{inventory.length}</div></CardContent>
                    </Card>
                </div>

                <Card className="rounded-3xl shadow-sm border-none bg-white p-2">
                    <div className="flex gap-2 p-2">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><MessageSquare className="h-6 w-6" /></div>
                        <Input 
                            placeholder="Type command: 'Sold 2 rosaries' or 'Add 5 candles'..." 
                            className="flex-1 border-none focus-visible:ring-0 text-sm font-medium"
                            value={textCommand}
                            onChange={e => setTextCommand(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleTextCommand(textCommand)}
                        />
                        <Button onClick={() => handleTextCommand(textCommand)} disabled={!textCommand || isAnalyzing} className="rounded-2xl">
                            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                </Card>

                {detectedSaleItems.length > 0 && (
                    <Card className="border-2 border-primary bg-primary/5 rounded-[32px] animate-in fade-in slide-in-from-top-4">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2 italic font-black"><Sparkles className="text-primary"/> Confirm Stock Movement</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {detectedSaleItems.map((sale, idx) => {
                                    const match = inventory.find(i => 
                                        i.name.toLowerCase() === sale.productName.toLowerCase() ||
                                        i.name.toLowerCase().includes(sale.productName.toLowerCase()) || 
                                        sale.productName.toLowerCase().includes(i.name.toLowerCase())
                                    );
                                    return (
                                        <div key={idx} className={cn("flex justify-between items-center p-3 bg-white rounded-xl border", !match && "border-amber-200 bg-amber-50/50")}>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={sale.qty < 0 ? 'destructive' : 'default'} className="rounded-full w-8 h-8 p-0 flex items-center justify-center font-bold">
                                                    {sale.qty > 0 ? '+' : ''}{sale.qty}
                                                </Badge>
                                                <div>
                                                    <span className="font-bold uppercase text-xs block">{sale.productName}</span>
                                                    {!match && sale.qty > 0 && <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-1"><Info className="h-2 w-2" /> New SKU: Product will be added</span>}
                                                    {!match && sale.qty < 0 && <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Error: Cannot sell unknown item</span>}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => setDetectedSaleItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setDetectedSaleItems([])}>Discard</Button>
                            <Button className="flex-1 rounded-2xl h-12 text-lg font-black" onClick={finalizeBulkSale} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="animate-spin" /> : "Confirm & Update Stock"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                    <div className="p-6 border-b flex justify-between items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search..." className="pl-9 h-10 rounded-xl" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" className="rounded-xl" onClick={() => loadData()}>
                                <History className="h-4 w-4 mr-2" /> Refresh
                            </Button>
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Product</TableHead>
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
                                                <div 
                                                    className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50 cursor-pointer group hover:border-primary transition-all"
                                                    onClick={() => document.getElementById(`img-update-${item.id}`)?.click()}
                                                    title="Click to update product image"
                                                >
                                                    <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Camera className="h-4 w-4 text-white" />
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        id={`img-update-${item.id}`} 
                                                        className="hidden" 
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpdate(item.id, e)}
                                                    />
                                                </div>
                                                <div>
                                                    <Link href={`/admin/inventory/${item.id}/timeline`} className="font-bold hover:underline hover:text-primary transition-colors uppercase italic">{item.name}</Link>
                                                    <p className="text-[9px] text-muted-foreground font-mono tracking-widest">{item.category}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                                    <span>Bought: {item.purchaseDate ? format(new Date(item.purchaseDate), 'dd MMM') : 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <CalendarIcon className="h-3 w-3 text-blue-500" />
                                                    <span>Added: {item.addedDate ? format(new Date(item.addedDate), 'dd MMM') : format(new Date(item.lastUpdated), 'dd MMM')}</span>
                                                </div>
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
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="rounded-xl h-8 text-[10px] uppercase font-bold"
                                                onClick={() => setPrintItem(item)}
                                            >
                                                <Printer className="h-3 w-3 mr-1" /> Label
                                            </Button>
                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] uppercase font-bold"><AlertTriangle className="h-3 w-3 mr-1" /> Damage</Button></DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>Report Damage / Loss: {item.name}</DialogTitle></DialogHeader>
                                                    <div className="py-4 space-y-4">
                                                        <div className="space-y-2"><Label>Quantity Lost</Label><Input type="number" id={`qty-loss-${item.id}`} defaultValue={1} /></div>
                                                        <div className="space-y-2"><Label>Reason for Loss</Label>
                                                            <Select onValueChange={(val) => {
                                                                const el = document.getElementById(`reason-loss-${item.id}`);
                                                                if(el) (el as any).value = val;
                                                            }} defaultValue="Damage">
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Damage">Damage / Broken</SelectItem>
                                                                    <SelectItem value="Expired">Expired</SelectItem>
                                                                    <SelectItem value="Missing">Missing / Theft</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <input type="hidden" id={`reason-loss-${item.id}`} value="Damage" />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <DialogClose asChild>
                                                            <Button variant="destructive" className="w-full h-12 font-bold rounded-2xl" onClick={async () => {
                                                                const qtyInput = document.getElementById(`qty-loss-${item.id}`) as HTMLInputElement;
                                                                const reasonInput = document.getElementById(`reason-loss-${item.id}`) as HTMLInputElement;
                                                                const qty = parseInt(qtyInput?.value) || 0;
                                                                const reason = reasonInput?.value || 'Damage';
                                                                await recordMovement(item, -qty, 'Damage', reason);
                                                            }}>Record Loss & Update Stock</Button>
                                                        </DialogClose>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isListening} onOpenChange={setIsListening}>
                <DialogContent className="max-w-sm rounded-[32px] p-8 text-center border-none shadow-2xl">
                    <DialogHeader><DialogTitle className="text-xl font-black uppercase italic tracking-widest text-primary">Listening Mode</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-6">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                            <Mic className="h-10 w-10 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">"{voiceTranscript || 'Say: Sold 2 Rosaries'}"</p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden Print Container */}
            <div className="hidden">
                <div ref={printRef}>
                    {printItem && <ProductLabel item={printItem} />}
                </div>
            </div>
        </AppShell>
    );
}
