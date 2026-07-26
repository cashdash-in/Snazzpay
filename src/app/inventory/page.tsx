'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Camera, Plus, Minus, Trash2, 
    FileSpreadsheet, TrendingUp, TrendingDown, 
    Package, MapPin, Search, AlertCircle, Sparkles,
    CheckCircle2, DollarSign
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';

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

export default function InventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [sales, setSales] = useState<SaleTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    
    // Sale Dialog State
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
            setInventory(stock);
            setSales(history);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Load Failed', description: 'Could not fetch data.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            try {
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
                toast({ title: 'Product Identified!', description: `AI found: ${aiData.productName}. Suggested MRP: ₹${aiData.suggestedMRP}` });
            } catch (err) {
                toast({ variant: 'destructive', title: 'Analysis Error', description: 'AI failed to identify product.' });
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const updated = inventory.map(item => item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item);
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
        const todaySales = sales.filter(s => startOfDay(new Date(s.date)).getTime() === today);
        return {
            revenue: todaySales.reduce((sum, s) => sum + (s.sellPrice * s.quantity), 0),
            profit: todaySales.reduce((sum, s) => sum + s.profit, 0),
            itemsSold: todaySales.reduce((sum, s) => sum + s.quantity, 0)
        };
    }, [sales]);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(inventory.map(i => ({
            Name: i.name,
            Category: i.category,
            Qty: i.quantity,
            Wholesale: i.wholesalePrice,
            MRP: i.mrp,
            Shelf: i.shelfNumber,
            Status: i.quantity === 0 ? 'OUT OF STOCK' : 'In Stock'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
        XLSX.writeFile(wb, `Shop_Inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredInventory = inventory.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.shelfNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppShell title="Shop Inventory & P&L">
            <div className="space-y-6">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-primary text-primary-foreground">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{dailyPnL.revenue.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                    <Card className={cn(dailyPnL.profit >= 0 ? "bg-green-600" : "bg-red-600", "text-white")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Daily Profit/Loss</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{dailyPnL.profit.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Items Sold Today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{dailyPnL.itemsSold}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total SKUs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{inventory.length}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search products or shelf numbers..." 
                            className="pl-9"
                            value={searchTerm}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={() => document.getElementById('camera-input')?.click()} disabled={isAnalyzing} className="flex-1">
                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Camera className="mr-2 h-4 w-4"/>}
                            Capture New Product
                        </Button>
                        <Button variant="outline" onClick={exportToExcel} className="flex-1">
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                        </Button>
                        <input type="file" id="camera-input" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                    </div>
                </div>

                {/* Inventory Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
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
                                    <TableRow key={item.id} className={item.quantity === 0 ? "bg-red-50/50" : ""}>
                                        <TableCell>
                                            <div className="relative w-12 h-12 rounded border overflow-hidden bg-white">
                                                <Image src={item.imageDataUri} fill alt="prod" className="object-cover" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Input 
                                                    value={item.name} 
                                                    onChange={e => updateItem(item.id, { name: e.target.value })}
                                                    className="h-8 font-medium border-transparent hover:border-input focus:border-input bg-transparent"
                                                />
                                                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                                <Input 
                                                    value={item.shelfNumber} 
                                                    onChange={e => updateItem(item.id, { shelfNumber: e.target.value })}
                                                    className="h-8 w-24 border-transparent hover:border-input focus:border-input bg-transparent"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-muted-foreground w-12">Wholesale:</span>
                                                    <Input 
                                                        type="number" 
                                                        value={item.wholesalePrice} 
                                                        onChange={e => updateItem(item.id, { wholesalePrice: parseFloat(e.target.value) || 0 })}
                                                        className="h-7 w-20 text-xs"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-muted-foreground w-12">MRP:</span>
                                                    <Input 
                                                        type="number" 
                                                        value={item.mrp} 
                                                        onChange={e => updateItem(item.id, { mrp: parseFloat(e.target.value) || 0 })}
                                                        className="h-7 w-20 text-xs font-bold"
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                                                        className={cn("h-8 w-16 text-center font-bold", item.quantity === 0 && "text-red-600 border-red-200")}
                                                    />
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                {item.quantity === 0 && (
                                                    <Badge variant="destructive" className="animate-pulse">RE-STOCK</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Dialog open={selectedSaleItem?.id === item.id} onOpenChange={open => !open && setSelectedSaleItem(null)}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="default" onClick={() => {
                                                        setSelectedSaleItem(item);
                                                        setSalePrice(item.mrp);
                                                        setSaleQty(1);
                                                    }} disabled={item.quantity === 0}>
                                                        <DollarSign className="h-4 w-4 mr-1" /> Sell
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Log Sale: {item.name}</DialogTitle>
                                                        <DialogDescription>Update stock and calculate daily profit.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Quantity Sold</Label>
                                                                <Input type="number" value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} max={item.quantity} min={1} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Sale Price (per unit)</Label>
                                                                <Input type="number" value={actualSellPrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                        </div>
                                                        <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                                                            <div className="flex justify-between"><span>Wholesale Cost:</span><span>₹{item.wholesalePrice}</span></div>
                                                            <div className="flex justify-between font-bold"><span>Total Profit:</span><span className="text-green-600">₹{((actualSellPrice - item.wholesalePrice) * saleQty).toFixed(2)}</span></div>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleSale} className="w-full">Confirm Sale & Update Stock</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteDocument('inventory', item.id).then(loadData)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
