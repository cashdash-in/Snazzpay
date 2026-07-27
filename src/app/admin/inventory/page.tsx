
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
    Loader2, 
    Camera, 
    Plus, 
    Minus, 
    Trash2, 
    FileSpreadsheet, 
    Package, 
    MapPin, 
    Search, 
    DollarSign, 
    History,
    ClipboardPaste,
    ImageIcon as LucideImageIcon
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
}

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [sales, setSales] = useState<SaleTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    
    const [selectedSaleItem, setSelectedSaleItem] = useState<InventoryItem | null>(null);
    const [saleQty, setSaleQty] = useState(1);
    const [actualSellPrice, setSalePrice] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
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
    };

    const processImage = useCallback(async (file: File) => {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
                // AI CAPTURE: Automatically identifies product name and suggests MRP
                const aiData = await analyzeInventoryItem({ imageDataUri: base64 });
                
                const newItem: InventoryItem = {
                    id: uuidv4(),
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
        // Clear input so same file can be uploaded again if needed
        e.target.value = '';
    };

    // COPY-PASTE Support: Listen for global paste events
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        toast({ title: "Pasted Image Detected!", description: "AI is starting identification..." });
                        processImage(file);
                        return; // Process first image found
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [processImage, toast]);

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const updated = inventory.map(item => {
            if (item.id === id) {
                const newItem = { ...item, ...updates, lastUpdated: new Date().toISOString() };
                if (newItem.quantity === 0 && item.quantity > 0) {
                    toast({
                        variant: "destructive",
                        title: "Out of Stock!",
                        description: `"${item.name}" is now out of stock. Please add stock soon.`,
                    });
                }
                return newItem;
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
            id: uuidv4(),
            productId: selectedSaleItem.id,
            productName: selectedSaleItem.name,
            quantity: saleQty,
            sellPrice: actualSellPrice,
            wholesalePrice: selectedSaleItem.wholesalePrice,
            profit: profit,
            date: new Date().toISOString()
        };

        try {
            await addDocument('sales_transactions', transaction);
            await updateItem(selectedSaleItem.id, { quantity: selectedSaleItem.quantity - saleQty });
            setSales(prev => [transaction, ...prev]);
            setSelectedSaleItem(null);
            toast({ title: 'Sale Recorded', description: `Profit: ₹${profit.toFixed(2)}` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Sale Failed' });
        }
    };

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

        // 1. Inventory Summary with Per-Product Performance
        const invSummary = inventory.map(i => {
            const itemSales = (sales || []).filter(s => s.productId === i.id);
            const totalQtySold = itemSales.reduce((sum, s) => sum + s.quantity, 0);
            const totalProfit = itemSales.reduce((sum, s) => sum + s.profit, 0);
            const totalRevenue = itemSales.reduce((sum, s) => sum + (s.sellPrice * s.quantity), 0);

            return {
                'Product Name': i.name,
                'Category': i.category,
                'Shelf Location': i.shelfNumber,
                'Current Stock': i.quantity,
                'Wholesale Price (Buy)': i.wholesalePrice,
                'MRP (Sell Limit)': i.mrp,
                'Total Qty Sold': totalQtySold,
                'Total Revenue': totalRevenue,
                'Total Profit/Loss (INR)': totalProfit,
                'Status': i.quantity === 0 ? 'OUT OF STOCK' : 'In Stock'
            };
        });
        const wsInv = XLSX.utils.json_to_sheet(invSummary);
        XLSX.utils.book_append_sheet(workbook, wsInv, 'Inventory Summary');

        // 2. Detailed Sales Ledger
        const ledgerData = (sales || []).map(s => ({
            'Date/Time': format(new Date(s.date), 'PPp'),
            'Product': s.productName,
            'Quantity Sold': s.quantity,
            'Sale Price (Unit)': s.sellPrice,
            'Wholesale Cost (Unit)': s.wholesalePrice,
            'Total Profit (INR)': s.profit,
            'Net Status': s.profit >= 0 ? 'PROFIT' : 'LOSS'
        }));
        const wsSales = XLSX.utils.json_to_sheet(ledgerData);
        XLSX.utils.book_append_sheet(workbook, wsSales, 'Sales Ledger');

        XLSX.writeFile(workbook, `Shop_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredInventory = (inventory || []).filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.shelfNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell title="Shop Inventory & P&L">
            <div className="space-y-6">
                {/* AI LOADING OVERLAY */}
                {isAnalyzing && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <Card className="p-8 flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-200">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <div className="text-center">
                                <h3 className="text-xl font-bold">AI Analyzing Product</h3>
                                <p className="text-muted-foreground">Identifying details and searching market MRP...</p>
                            </div>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-lg">
                        <CardHeader className="pb-2 text-center"><CardTitle className="text-sm font-medium uppercase tracking-wider">Daily Revenue</CardTitle></CardHeader>
                        <CardContent className="text-center"><div className="text-3xl font-black">₹{dailyPnL.revenue.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className={cn(dailyPnL.profit >= 0 ? "bg-green-600" : "bg-red-600", "text-white shadow-lg")}>
                        <CardHeader className="pb-2 text-center"><CardTitle className="text-sm font-medium uppercase tracking-wider">Daily Profit/Loss</CardTitle></CardHeader>
                        <CardContent className="text-center"><div className="text-3xl font-black">₹{dailyPnL.profit.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="pb-2 text-center"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Items Sold Today</CardTitle></CardHeader>
                        <CardContent className="text-center"><div className="text-3xl font-black text-slate-800">{dailyPnL.itemsSold}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/10">
                        <CardHeader className="pb-2 text-center"><CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total SKUs</CardTitle></CardHeader>
                        <CardContent className="text-center"><div className="text-3xl font-black text-slate-800">{inventory.length}</div></CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-md border border-primary/5">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search products or shelf numbers..." className="pl-9 rounded-xl" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <Button 
                            onClick={() => document.getElementById('camera-input')?.click()} 
                            disabled={isAnalyzing} 
                            className="flex-1 rounded-xl h-11 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4"/>}
                            Capture New Product
                        </Button>
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 text-xs font-bold">
                            <ClipboardPaste className="h-4 w-4" />
                            <span>TIP: You can Ctrl+V to paste images</span>
                        </div>
                        <Button variant="outline" onClick={exportToExcel} className="flex-1 rounded-xl h-11 border-primary/20 hover:bg-primary/5">
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-primary" /> Export Detailed Report
                        </Button>
                        <input 
                            type="file" 
                            id="camera-input" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                </div>

                <Tabs defaultValue="stock">
                    <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-200/50 rounded-xl p-1">
                        <TabsTrigger value="stock" className="rounded-lg font-bold uppercase text-xs"><Package className="mr-2 h-4 w-4" /> Current Stock</TabsTrigger>
                        <TabsTrigger value="ledger" className="rounded-lg font-bold uppercase text-xs"><History className="mr-2 h-4 w-4" /> Sales Ledger</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stock" className="mt-4">
                        <Card className="rounded-2xl border-none shadow-xl overflow-hidden">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="w-[80px]">Image</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Shelf</TableHead>
                                            <TableHead>Price (Wholesale/MRP)</TableHead>
                                            <TableHead>Current Stock</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInventory.map(item => (
                                            <TableRow key={item.id} className={cn(item.quantity === 0 ? "bg-red-50/50" : "hover:bg-slate-50/50 transition-colors")}>
                                                <TableCell>
                                                    <div className="relative w-12 h-12 rounded-xl border overflow-hidden bg-white shadow-sm">
                                                        {item.imageDataUri ? (
                                                            <Image src={item.imageDataUri} fill alt="prod" className="object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full bg-slate-100 text-[10px] text-slate-400">NO IMG</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Input value={item.name} onChange={e => updateItem(item.id, { name: e.target.value })} className="h-8 font-bold border-transparent hover:border-input focus:border-input bg-transparent px-1" />
                                                        <Badge variant="outline" className="text-[10px] font-black uppercase italic tracking-tighter">{item.category}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell><div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" /><Input className="h-8 w-24 border-transparent hover:border-input focus:border-input bg-transparent px-1 font-mono text-xs" value={item.shelfNumber} onChange={e => updateItem(item.id, { shelfNumber: e.target.value })} /></div></TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-12 font-bold uppercase">Buy:</span><Input type="number" value={item.wholesalePrice} onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })} className="h-7 w-24 text-xs font-mono" /></div>
                                                        <div className="flex items-center gap-1"><span className="text-[10px] text-muted-foreground w-12 font-bold uppercase">MRP:</span><Input type="number" value={item.mrp} onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })} className="h-7 w-24 text-xs font-black" /></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                                                            <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} className={cn("h-8 w-14 text-center font-black border-none bg-transparent", item.quantity === 0 && "text-red-600")} />
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                                                        </div>
                                                        {item.quantity === 0 && <Badge variant="destructive" className="animate-pulse text-[8px] font-black uppercase">RE-STOCK</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Dialog open={selectedSaleItem?.id === item.id} onOpenChange={open => !open && setSelectedSaleItem(null)}>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" onClick={() => { setSelectedSaleItem(item); setSalePrice(item.mrp); setSaleQty(1); }} disabled={item.quantity === 0} className="rounded-lg shadow-sm">
                                                                <DollarSign className="h-4 w-4 mr-1" /> Sell
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="rounded-[32px]">
                                                            <DialogHeader><DialogTitle className="text-xl font-black italic uppercase">Log Sale: {item.name}</DialogTitle></DialogHeader>
                                                            <div className="space-y-4 py-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Quantity Sold</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} max={item.quantity} min={1} className="rounded-xl" /></div>
                                                                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sale Price (per unit)</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} className="rounded-xl font-black" /></div>
                                                                </div>
                                                                <div className="p-6 bg-slate-900 text-white rounded-[24px] space-y-2">
                                                                    <div className="flex justify-between text-xs text-slate-400 font-bold uppercase"><span>Wholesale Cost</span><span>₹{item.wholesalePrice}</span></div>
                                                                    <div className="flex justify-between items-center border-t border-white/10 pt-2">
                                                                        <span className="text-sm font-black italic uppercase">Total Profit</span>
                                                                        <span className="text-2xl font-black text-green-400">₹{((actualSellPrice - item.wholesalePrice) * saleQty).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <DialogFooter><Button onClick={handleSale} className="w-full h-12 rounded-xl text-lg font-black italic uppercase tracking-tighter">Confirm Sale</Button></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:bg-red-50" onClick={() => deleteDocument('inventory', item.id).then(loadData)}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ledger" className="mt-4">
                        <Card className="rounded-2xl border-none shadow-xl">
                            <CardHeader><CardTitle className="text-lg font-black italic uppercase">Sales & Profit Ledger</CardTitle><CardDescription>A chronological record of every sale made today and historically.</CardDescription></CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Date/Time</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Revenue</TableHead>
                                            <TableHead>Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...(sales || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                                            <TableRow key={s.id} className="hover:bg-slate-50/50">
                                                <TableCell className="text-[10px] text-muted-foreground font-mono">{format(new Date(s.date), 'PPp')}</TableCell>
                                                <TableCell className="font-bold text-slate-800">{s.productName}</TableCell>
                                                <TableCell className="font-medium">{s.quantity}</TableCell>
                                                <TableCell className="font-bold">₹{(s.sellPrice * s.quantity).toFixed(2)}</TableCell>
                                                <TableCell className={cn("font-black italic", s.profit >= 0 ? "text-green-600" : "text-red-600")}>₹{s.profit.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {(!sales || sales.length === 0) && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">No sales recorded yet. Click "Sell" on a product to begin tracking.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    );
}
