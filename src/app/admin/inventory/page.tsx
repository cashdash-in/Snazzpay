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
    X
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
    const [searchTerm, setSearchQuery] = useState('');
    
    const [isScanning, setIsScanning] = useState(false);
    const [selectedItemForLabel, setSelectedItemForLabel] = useState<InventoryItem | null>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
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
            toast({ variant: 'destructive', title: 'Load Failed', description: 'Could not fetch data.' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
                    lastUpdated: new Date().toISOString()
                };

                await saveDocument('inventory', newItem, newItem.id);
                setInventory(prev => [newItem, ...prev]);
                toast({ 
                    title: 'Product Identified!', 
                    description: `AI found: ${aiData.productName}. Suggested MRP: ₹${aiData.suggestedMRP}` 
                });
            } catch (err) {
                toast({ variant: 'destructive', title: 'Analysis Error', description: 'AI failed to identify product.' });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }, [toast]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processImage(file);
        e.target.value = '';
    };

    const handleScanSuccess = (code: string) => {
        const searchCode = code.toUpperCase().trim();
        const item = inventory.find(i => i.id === searchCode || i.id.substring(0, 8) === searchCode);
        if (item) {
            setSelectedSaleItem(item);
            setSalePrice(item.mrp);
            setSaleQty(1);
            setIsScanning(false);
            toast({ title: "Product Found", description: `Scanned: ${item.name}` });
        } else {
            toast({ variant: "destructive", title: "Invalid Code", description: "No product found with this ID or QR code." });
        }
    };

    const handleManualScanInput = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const code = formData.get('qr-input') as string;
        if (code) handleScanSuccess(code);
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const updated = inventory.map(item => {
            if (item.id === id) {
                return { ...item, ...updates, lastUpdated: new Date().toISOString() };
            }
            return item;
        });
        setInventory(updated);
        const item = updated.find(i => i.id === id);
        if (item) await saveDocument('inventory', item, id);
    };

    const handleSale = async () => {
        if (!selectedSaleItem) return;
        if (saleQty > selectedSaleItem.quantity) {
            toast({ variant: 'destructive', title: 'Stock Error', description: 'Not enough stock available.' });
            return;
        }

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
            
            toast({ title: 'Sale Recorded', description: `Profit: ₹${profit.toFixed(2)}` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Sale Failed' });
        }
    };

    const sendWhatsAppInvoice = () => {
        if (!lastProcessedSale || !lastProcessedSale.customerPhone) return;
        
        const message = `*INVOICE: ${lastProcessedSale.productName}*\n\n` +
            `Hello! Thank you for shopping with us.\n\n` +
            `*Product:* ${lastProcessedSale.productName}\n` +
            `*Qty:* ${lastProcessedSale.quantity}\n` +
            `*Total:* ₹${(lastProcessedSale.sellPrice * lastProcessedSale.quantity).toFixed(2)}\n\n` +
            `Order ID: #${lastProcessedSale.id}\n` +
            `Date: ${format(new Date(), 'PP')}\n\n` +
            `Regards,\n*Snazzify Shop*`;

        const whatsappUrl = `https://wa.me/${sanitizePhoneNumber(lastProcessedSale.customerPhone)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowPostSaleDialog(false);
    };

    const handlePrintLabel = useReactToPrint({
        content: () => labelRef.current,
        documentTitle: `Label-${selectedItemForLabel?.id || 'product'}`,
    });

    const dailyPnL = useMemo(() => {
        const today = startOfDay(new Date()).getTime();
        const todaySales = (sales || []).filter(s => {
            try {
                return startOfDay(new Date(s.date)).getTime() === today;
            } catch (e) { return false; }
        });
        return {
            revenue: todaySales.reduce((sum, s) => sum + (s.sellPrice * s.quantity), 0),
            profit: todaySales.reduce((sum, s) => sum + s.profit, 0),
            itemsSold: todaySales.reduce((sum, s) => sum + s.quantity, 0)
        };
    }, [sales]);

    const exportToExcel = () => {
        const workbook = XLSX.utils.book_new();
        const invSummary = inventory.map(i => ({
            'ID/Marker Code': i.id,
            'Product Name': i.name,
            'Category': i.category,
            'Shelf': i.shelfNumber,
            'Current Stock': i.quantity,
            'MRP (INR)': i.mrp,
            'Wholesale Cost': i.wholesalePrice
        }));
        const wsInv = XLSX.utils.json_to_sheet(invSummary);
        XLSX.utils.book_append_sheet(workbook, wsInv, 'Inventory');
        XLSX.writeFile(workbook, `Shop_Inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredInventory = (inventory || []).filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell title="Shop Inventory & P&L">
            <div className="space-y-6">
                {isAnalyzing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Card className="p-8 flex flex-col items-center gap-4 shadow-2xl">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <div className="text-center">
                                <h3 className="text-xl font-bold">AI Analyzing Product</h3>
                                <p className="text-muted-foreground">Identifying details and searching market MRP...</p>
                            </div>
                        </Card>
                    </div>
                )}

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
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search name or Marker ID..." className="pl-9" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button onClick={() => setIsScanning(true)} variant="default" className="flex-1">
                            <Scan className="mr-2 h-5 w-5 text-primary" />
                            Scan to Sell
                        </Button>
                        <Button onClick={() => document.getElementById('camera-input')?.click()} disabled={isAnalyzing} className="flex-1">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4"/>}
                            Capture New
                        </Button>
                        <Button variant="outline" onClick={exportToExcel} className="rounded-xl">
                            <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <input type="file" id="camera-input" accept="image/*" className="hidden" onChange={handleImageUpload} />
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
                                                           {item.imageDataUri ? (
                                                               <Image src={item.imageDataUri} fill alt="p" className="object-cover" />
                                                           ) : (
                                                               <QrCode className="h-6 w-6 text-slate-300" />
                                                           )}
                                                        </div>
                                                        <span className="text-[10px] font-mono font-bold text-primary">{item.id.substring(0,8)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Input value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} className="h-8 font-medium border-transparent hover:border-input focus:border-input bg-transparent" />
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
                                                        {item.quantity === 0 && <Badge variant="destructive" className="animate-pulse text-[8px]">RE-STOCK</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedItemForLabel(item)}>
                                                                <Printer className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-xs p-6">
                                                            <DialogHeader><DialogTitle className="text-center italic uppercase font-black">Print Label</DialogTitle></DialogHeader>
                                                            <div className="flex flex-col items-center gap-4 py-4">
                                                                <div ref={labelRef} className="p-4 border-2 border-slate-900 bg-white rounded w-[2in] text-center shadow-md">
                                                                    <p className="text-[10px] font-bold uppercase mb-1 truncate">{item.name}</p>
                                                                    <div className="flex justify-center mb-1">
                                                                        <img 
                                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${item.id.substring(0,8)}`} 
                                                                            width={100} height={100} alt="qr" 
                                                                        />
                                                                    </div>
                                                                    <p className="text-lg font-mono font-black tracking-tighter leading-none">{item.id.substring(0,8)}</p>
                                                                    <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">MRP: ₹{item.mrp}</p>
                                                                </div>
                                                                <Button onClick={handlePrintLabel} className="w-full">
                                                                    Print to Sticker
                                                                </Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Dialog open={selectedSaleItem?.id === item.id} onOpenChange={open => !open && setSelectedSaleItem(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" onClick={() => { setSelectedSaleItem(item); setSalePrice(item.mrp); setSaleQty(1); }} disabled={item.quantity === 0}>
                                                                <DollarSign className="h-4 w-4 mr-1" /> Sell
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-md p-6">
                                                            <DialogHeader><DialogTitle className="text-xl font-bold italic uppercase">Log Quick Sale</DialogTitle></DialogHeader>
                                                            <div className="space-y-6 pt-4">
                                                                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border">
                                                                    <div className="relative w-12 h-12 rounded overflow-hidden shrink-0"><Image src={item.imageDataUri} fill className="object-cover" alt="p" /></div>
                                                                    <div><h4 className="font-bold">{item.name}</h4><p className="text-xs uppercase opacity-70">{item.category}</p></div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Qty Sold</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} max={item.quantity} min={1} /></div>
                                                                    <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Sale Price (Each)</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} /></div>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-bold opacity-60">Customer Phone (WhatsApp Invoice)</Label>
                                                                    <Input placeholder="9876543210" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                                                </div>
                                                                <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center">
                                                                    <div><p className="text-[10px] font-bold text-green-700">Profit</p><p className="text-lg font-bold text-green-600">₹{((actualSellPrice - item.wholesalePrice) * saleQty).toFixed(2)}</p></div>
                                                                    <div className="text-right font-black italic uppercase leading-none"><span className="text-[10px] text-green-700 block">Total</span><span className="text-xl text-green-600">₹{(actualSellPrice * saleQty).toFixed(2)}</span></div>
                                                                </div>
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
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Revenue</TableHead>
                                            <TableHead>Profit</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...(sales || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell className="text-[10px] text-muted-foreground">{format(new Date(s.date), 'p d/M')}</TableCell>
                                                <TableCell className="font-bold text-sm">{s.productName}</TableCell>
                                                <TableCell className="font-bold">₹{(s.sellPrice * s.quantity).toFixed(2)}</TableCell>
                                                <TableCell className={cn("font-bold", s.profit >= 0 ? "text-green-600" : "text-red-600")}>₹{s.profit.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    {s.customerPhone && (
                                                        <Button variant="ghost" size="icon" onClick={() => { setLastProcessedSale(s); setShowPostSaleDialog(true); }}>
                                                            <MessageSquare className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!sales || sales.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">No sales recorded.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <Dialog open={isScanning} onOpenChange={setIsScanning}>
                    <DialogContent className="max-w-sm p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold uppercase">Mobile Scanner</DialogTitle>
                            <DialogDescription>Scan QR or enter the ID you wrote with a marker.</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-6 py-4">
                            <div className="relative w-40 h-40 border-4 border-primary border-dashed rounded-3xl flex items-center justify-center bg-slate-50 overflow-hidden">
                                <QrCode className="h-24 w-24 text-slate-200" />
                                <div className="w-full h-0.5 bg-primary absolute top-1/2 animate-bounce"></div>
                            </div>
                            <form onSubmit={handleManualScanInput} className="w-full space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold uppercase opacity-60">Marker ID Entry</Label>
                                    <div className="flex gap-2">
                                        <Input name="qr-input" placeholder="e.g. 4B7X-A2Z1" className="h-12 font-mono font-bold text-center uppercase" />
                                        <Button type="submit" className="h-12 w-12">Go</Button>
                                    </div>
                                </div>
                            </form>
                            <p className="text-[10px] text-muted-foreground text-center italic">Tip: Write the 8-character ID on the product box for quick lookup.</p>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={showPostSaleDialog} onOpenChange={setShowPostSaleDialog}>
                    <DialogContent className="max-w-sm p-8 text-center">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle2 className="h-10 w-10"/></div>
                            <div>
                                <h3 className="text-xl font-bold uppercase">Sale Confirmed!</h3>
                                <p className="text-sm text-muted-foreground">Stock has been updated.</p>
                            </div>
                            <div className="w-full space-y-2">
                                {lastProcessedSale?.customerPhone && (
                                    <Button onClick={sendWhatsAppInvoice} className="w-full h-12 bg-green-600 hover:bg-green-700">
                                        <MessageSquare className="mr-2 h-4 w-4" /> Send WhatsApp Invoice
                                    </Button>
                                )}
                                <Button variant="outline" className="w-full h-12" onClick={() => setShowPostSaleDialog(false)}>
                                    Next Sale
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}
