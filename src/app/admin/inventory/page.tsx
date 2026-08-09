'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Camera, 
    Plus, 
    Minus, 
    Trash2, 
    FileSpreadsheet, 
    Package, 
    Search, 
    DollarSign, 
    History,
    QrCode,
    Scan,
    MessageSquare,
    CheckCircle2,
    Printer,
    TrendingUp,
    X,
    Info,
    Sparkles,
    Link as LinkIcon,
    Copy,
    PackagePlus
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, sanitizePhoneNumber } from "@/lib/utils";
import { useReactToPrint } from 'react-to-print';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface CompetitorInfo {
    sellerName: string;
    price: number;
}

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    wholesalePrice: number;
    mrp: number;
    shelfNumber: string;
    imageDataUri: string;
    category: string;
    lastUpdated: string;
    description?: string;
    sellingPoints?: string[];
    marketInsight?: string;
    competitors?: CompetitorInfo[];
}

interface SaleTransaction {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    sellPrice: number;
    wholesalePrice: number;
    profit: number;
    date: string;
    customerPhone?: string;
}

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [sales, setSales] = useState<SaleTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRestocking, setIsRestocking] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [todayTimestamp, setTodayTimestamp] = useState<number | null>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [selectedItemForLabel, setSelectedItemForLabel] = useState<InventoryItem | null>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);
    const [customerPhone, setCustomerPhone] = useState('');
    const [showPostSaleDialog, setShowPostSaleDialog] = useState(false);
    const [lastProcessedSale, setLastProcessedSale] = useState<SaleTransaction | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [stock, history] = await Promise.all([
                getCollection<InventoryItem>('inventory'),
                getCollection<SaleTransaction>('sales_transactions')
            ]);
            setInventory(stock || []);
            setSales(history || []);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Load Failed' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        setIsMounted(true);
        setTodayTimestamp(startOfDay(new Date()).getTime());
        loadData();
    }, [loadData]);

    const getProductLink = (item: InventoryItem) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/catalogue?id=${item.id}&sellerId=admin&sellerName=Snazzify`;
    };

    const handleCopyLink = (item: InventoryItem) => {
        const link = getProductLink(item);
        navigator.clipboard.writeText(link);
        toast({ title: "Order Link Copied!", description: "Send this link to customers on WhatsApp." });
    };

    const handleScanSuccess = useCallback((code: string) => {
        let lookupId = code.toUpperCase().trim();
        
        if (code.includes('?id=')) {
            const url = new URL(code);
            const idFromUrl = url.searchParams.get('id');
            if (idFromUrl) lookupId = idFromUrl.toUpperCase();
        }

        const cleanLookupId = lookupId.replace(/[^A-Z0-9]/g, '');
        const item = inventory.find(i => {
            const normalizedId = i.id.toUpperCase().replace(/[^A-Z0-9]/g, '');
            return normalizedId === cleanLookupId || normalizedId.startsWith(cleanLookupId);
        });

        if (item) {
            setSelectedSaleItem(item);
            setSalePrice(item.mrp);
            setSaleQty(1);
            setIsScanning(false);
            toast({ title: "Product Found", description: `Scanned: ${item.name}` });
        } else {
            toast({ variant: "destructive", title: "Invalid Code", description: "No product found with this ID." });
        }
    }, [inventory, toast]);

    useEffect(() => {
        if (!isScanning || !isMounted) return;
        const timer = setTimeout(() => {
            const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
            scanner.render((decodedText) => {
                handleScanSuccess(decodedText);
                scanner.clear().catch(console.warn);
            }, () => {});
            return () => scanner.clear().catch(console.warn);
        }, 100);
        return () => clearTimeout(timer);
    }, [isScanning, isMounted, handleScanSuccess]);

    const processImage = useCallback(async (file: File) => {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
                const aiData = await analyzeInventoryItem({ imageDataUri: base64 });
                const shortId = uuidv4().substring(0, 8).toUpperCase();
                const newItem: InventoryItem = {
                    id: shortId, 
                    name: aiData.productName,
                    quantity: 1,
                    wholesalePrice: 0,
                    mrp: aiData.suggestedMRP,
                    shelfNumber: 'Pending',
                    imageDataUri: base64,
                    category: aiData.category,
                    lastUpdated: new Date().toISOString(),
                    description: aiData.description,
                    sellingPoints: aiData.sellingPoints,
                    marketInsight: aiData.marketInsight,
                    competitors: aiData.competitors,
                };
                await saveDocument('inventory', newItem, newItem.id);
                setInventory(prev => [newItem, ...prev]);
                toast({ title: 'Product Identified!', description: aiData.productName });
            } catch (err) {
                toast({ variant: 'destructive', title: 'Analysis Error' });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }, [toast]);

    const processRestockImage = useCallback(async (file: File) => {
        setIsRestocking(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
                const aiData = await analyzeInventoryItem({ imageDataUri: base64 });
                
                // Try to find a match in existing inventory (case insensitive)
                const match = inventory.find(i => 
                    i.name.toLowerCase() === aiData.productName.toLowerCase() ||
                    aiData.productName.toLowerCase().includes(i.name.toLowerCase()) ||
                    i.name.toLowerCase().includes(aiData.productName.toLowerCase())
                );

                if (match) {
                    const newQty = match.quantity + 1;
                    await updateItem(match.id, { quantity: newQty });
                    toast({ 
                        title: 'Stock Updated!', 
                        description: `Identified ${match.name}. Quantity increased to ${newQty}.`,
                        className: "bg-green-50 border-green-200"
                    });
                } else {
                    toast({ 
                        variant: 'destructive', 
                        title: 'Match Not Found', 
                        description: `Identified as "${aiData.productName}", but no matching product exists in your stock. Use 'Capture New' to add it.` 
                    });
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'Analysis Error', description: 'Could not identify product from image.' });
            } finally {
                setIsRestocking(false);
            }
        };
        reader.readAsDataURL(file);
    }, [inventory, toast]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processImage(file);
        e.target.value = '';
    };

    const handleRestockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processRestockImage(file);
        e.target.value = '';
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const updated = inventory.map(item => item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item);
        setInventory(updated);
        const item = updated.find(i => i.id === id);
        if (item) await saveDocument('inventory', item, id);
    };

    const handleSale = async () => {
        if (!selectedSaleItem) return;
        const profit = (actualSellPrice - selectedSaleItem.wholesalePrice) * saleQty;
        const transaction: SaleTransaction = {
            id: uuidv4().substring(0, 6).toUpperCase(),
            productId: selectedSaleItem.id,
            productName: selectedSaleItem.name,
            quantity: saleQty,
            sellPrice: actualSellPrice,
            wholesalePrice: selectedSaleItem.wholesalePrice,
            profit: profit,
            date: new Date().toISOString(),
            customerPhone: customerPhone
        };
        try {
            await addDocument('sales_transactions', transaction);
            await updateItem(selectedSaleItem.id, { quantity: selectedSaleItem.quantity - saleQty });
            setSales(prev => [transaction, ...prev]);
            setLastProcessedSale(transaction);
            setSelectedSaleItem(null);
            setShowPostSaleDialog(true);
            toast({ title: 'Sale Recorded' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Sale Failed' });
        }
    };

    const sendWhatsAppInvoice = () => {
        if (!lastProcessedSale || !lastProcessedSale.customerPhone) return;
        const message = `*INVOICE: ${lastProcessedSale.productName}*\n\nQty: ${lastProcessedSale.quantity}\nTotal: ₹${(lastProcessedSale.sellPrice * lastProcessedSale.quantity).toFixed(2)}\n\nOrder ID: #${lastProcessedSale.id}\n\nRegards,\n*Snazzify Shop*`;
        window.open(`https://wa.me/${sanitizePhoneNumber(lastProcessedSale.customerPhone)}?text=${encodeURIComponent(message)}`, '_blank');
        setShowPostSaleDialog(false);
    };

    const handlePrintLabel = useReactToPrint({
        content: () => labelRef.current,
        documentTitle: `Label-${selectedItemForLabel?.id || 'product'}`,
    });

    const dailyPnL = useMemo(() => {
        if (!todayTimestamp) return { revenue: 0, profit: 0, itemsSold: 0 };
        const todaySales = sales.filter(s => startOfDay(new Date(s.date)).getTime() === todayTimestamp);
        return {
            revenue: todaySales.reduce((sum, s) => sum + (s.sellPrice * s.quantity), 0),
            profit: todaySales.reduce((sum, s) => sum + s.profit, 0),
            itemsSold: todaySales.reduce((sum, s) => sum + s.quantity, 0)
        };
    }, [sales, todayTimestamp]);

    const filteredInventory = inventory.filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <AppShell title="Shop Inventory & P&L">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-2 opacity-20"><TrendingUp className="h-12 w-12"/></div>
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Daily Revenue</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black italic">₹{dailyPnL.revenue.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className={cn(dailyPnL.profit >= 0 ? "bg-green-600" : "bg-red-600", "text-white shadow-lg border-none")}>
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest">Daily Profit</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black italic">₹{dailyPnL.profit.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/5">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Items Sold</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-slate-800">{dailyPnL.itemsSold}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/5">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total SKUs</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-slate-800">{inventory.length}</div></CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-primary/5">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search stock..." className="pl-9" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button onClick={() => setIsScanning(true)} variant="default" className="flex-1">
                            <Scan className="mr-2 h-5 w-5" /> Scan to Sell
                        </Button>
                        <Button onClick={() => document.getElementById('camera-restock-input')?.click()} disabled={isRestocking} variant="secondary" className="flex-1">
                            {isRestocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PackagePlus className="mr-2 h-4 w-4"/>} Capture to Update
                        </Button>
                        <Button onClick={() => document.getElementById('camera-new-input')?.click()} disabled={isAnalyzing} className="flex-1">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4"/>} Capture New
                        </Button>
                        
                        <input type="file" id="camera-restock-input" accept="image/*" className="hidden" onChange={handleRestockUpload} />
                        <input type="file" id="camera-new-input" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                </div>

                <Tabs defaultValue="stock">
                    <TabsList className="grid w-full grid-cols-2 max-w-md">
                        <TabsTrigger value="stock"><Package className="mr-2 h-4 w-4" /> Live Stock</TabsTrigger>
                        <TabsTrigger value="ledger"><History className="mr-2 h-4 w-4" /> Sales History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stock" className="mt-4">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Marker ID</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Price (MRP)</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInventory.map(item => (
                                            <TableRow key={item.id} className={cn(item.quantity === 0 ? "bg-red-50/50" : "")}>
                                                <TableCell>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="relative w-10 h-10 rounded border overflow-hidden bg-white flex items-center justify-center">
                                                           {item.imageDataUri ? <Image src={item.imageDataUri} fill alt="p" className="object-cover" /> : <QrCode className="h-6 w-6 text-slate-300" />}
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-primary">{item.id.substring(0,8)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Dialog open={selectedDetailItem?.id === item.id} onOpenChange={open => !open && setSelectedDetailItem(null)}>
                                                            <DialogTrigger asChild>
                                                                <button className="font-bold text-left hover:text-primary transition-colors hover:underline flex items-center gap-1" onClick={() => setSelectedDetailItem(item)}>
                                                                    {item.name} <Info className="h-3 w-3 opacity-30" />
                                                                </button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-3xl rounded-[32px] p-0 overflow-hidden bg-white">
                                                                <div className="grid grid-cols-1 md:grid-cols-2">
                                                                    <div className="relative aspect-square">
                                                                        {selectedDetailItem?.imageDataUri && <Image src={selectedDetailItem.imageDataUri} fill alt="p" className="object-cover" />}
                                                                        <Badge className="absolute top-4 left-4 bg-primary text-white italic">{selectedDetailItem?.category}</Badge>
                                                                    </div>
                                                                    <div className="p-8 space-y-6">
                                                                        <h4 className="text-3xl font-black italic uppercase leading-none">{selectedDetailItem?.name}</h4>
                                                                        <div className="space-y-2">
                                                                            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Sparkles className="h-3 w-3 text-purple-500" /> Sales Pitch</h5>
                                                                            <ul className="space-y-1.5">
                                                                                {selectedDetailItem?.sellingPoints?.map((p, i) => <li key={i} className="text-xs font-bold italic bg-purple-50 p-2 rounded-lg text-purple-900">"{p}"</li>)}
                                                                            </ul>
                                                                        </div>
                                                                        <DialogClose asChild><Button className="w-full h-12 text-lg font-bold rounded-2xl">Close Details</Button></DialogClose>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <Badge variant="outline" className="text-[9px] uppercase">{item.category}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground w-8">MRP:</span><Input type="number" value={item.mrp} onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-xs font-bold" /></div>
                                                        <div className="flex items-center gap-1"><span className="text-[8px] text-muted-foreground w-8">Cost:</span><Input type="number" value={item.wholesalePrice} onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })} className="h-7 w-20 text-xs" /></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center border rounded-lg p-0.5">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                                                            <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className={cn("h-7 w-12 text-center font-bold border-none", item.quantity === 0 && "text-red-600")} />
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(item)} title="Copy Order Link">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedItemForLabel(item)}><Printer className="h-4 w-4" /></Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-xs p-6 bg-white">
                                                            <DialogHeader><DialogTitle className="text-center italic uppercase font-black">Print Label</DialogTitle></DialogHeader>
                                                            <div className="flex flex-col items-center gap-4 py-4">
                                                                <div ref={labelRef} className="p-4 border-2 border-slate-900 bg-white rounded w-[2in] text-center shadow-md">
                                                                    <p className="text-[10px] font-bold uppercase mb-1 truncate">{item.name}</p>
                                                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getProductLink(item))}`} width={100} height={100} alt="qr" className="mx-auto mb-1" />
                                                                    <p className="text-lg font-mono font-black tracking-tighter leading-none">{item.id.substring(0,8)}</p>
                                                                </div>
                                                                <Button onClick={handlePrintLabel} className="w-full">Print to Sticker</Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Dialog open={selectedSaleItem?.id === item.id} onOpenChange={open => !open && setSelectedSaleItem(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" onClick={() => { setSelectedSaleItem(item); setSalePrice(item.mrp); setSaleQty(1); }} disabled={item.quantity === 0}>
                                                                <DollarSign className="h-4 w-4 mr-1" /> Sell
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-md p-6 bg-white">
                                                            <DialogHeader><DialogTitle className="text-xl font-bold italic uppercase">Log Quick Sale</DialogTitle></DialogHeader>
                                                            <div className="space-y-6 pt-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Qty Sold</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} max={item.quantity} min={1} /></div>
                                                                    <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Sale Price</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} /></div>
                                                                </div>
                                                                <div className="space-y-1"><Label className="text-xs font-bold opacity-60">WhatsApp Number</Label><Input placeholder="Customer Mobile" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                                                                <Button onClick={handleSale} className="w-full h-12">Confirm Sale</Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteDocument('inventory', item.id).then(loadData)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="ledger" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle className="text-lg font-bold uppercase">Sales Ledger</CardTitle></CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Product</TableHead><TableHead>Revenue</TableHead><TableHead>Profit</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {[...(sales || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell className="text-[10px] text-muted-foreground">{format(new Date(s.date), 'p d/M')}</TableCell>
                                                <TableCell className="font-bold text-sm">{s.productName}</TableCell>
                                                <TableCell className="font-bold">₹{(s.sellPrice * s.quantity).toFixed(2)}</TableCell>
                                                <TableCell className={cn("font-bold", s.profit >= 0 ? "text-green-600" : "text-red-600")}>₹{s.profit.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogContent className="max-w-sm p-6 bg-white">
                        <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Mobile Scanner</DialogTitle></DialogHeader>
                        <div className="flex flex-col items-center gap-6 py-4">
                            <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-primary/20 min-h-[250px] bg-slate-100 flex items-center justify-center">
                                <p className="text-xs text-muted-foreground">Initializing camera...</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showPostSaleDialog} onOpenChange={setShowPostSaleDialog}>
                    <DialogContent className="max-w-sm p-8 text-center bg-white">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle2 className="h-10 w-10"/></div>
                            <div><h3 className="text-xl font-bold uppercase">Sale Confirmed!</h3><p className="text-sm text-muted-foreground">Stock updated.</p></div>
                            <div className="w-full space-y-2">
                                {lastProcessedSale?.customerPhone && <Button onClick={sendWhatsAppInvoice} className="w-full h-12 bg-green-600 hover:bg-green-700"><MessageSquare className="mr-2 h-4 w-4" /> Send WhatsApp Invoice</Button>}
                                <Button variant="outline" className="w-full h-12" onClick={() => setShowPostSaleDialog(false)}>Next Sale</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}