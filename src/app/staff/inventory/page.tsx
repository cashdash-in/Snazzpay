'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, Camera, Plus, Minus, Search, DollarSign, 
    Scan, ShoppingBag, CheckCircle2, MessageSquare, LogOut, 
    Sparkles, Info, TrendingUp, QrCode
} from 'lucide-react';
import { getCollection, saveDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { cn, sanitizePhoneNumber } from "@/lib/utils";
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '@/hooks/use-auth';

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

export default function StaffInventoryPage() {
    const { toast } = useToast();
    const { signOut } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
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
            const stock = await getCollection<InventoryItem>('inventory');
            setInventory(stock || []);
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

    const handleScanSuccess = useCallback((code: string) => {
        const searchCode = code.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
        const item = inventory.find(i => i.id.toUpperCase().replace(/[^A-Z0-9]/g, '') === searchCode);

        if (item) {
            setSelectedSaleItem(item);
            setSalePrice(item.mrp);
            setSaleQty(1);
            setIsScanning(false);
            toast({ title: "Product Found", description: item.name });
        } else {
            toast({ variant: "destructive", title: "Invalid Code" });
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
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

    const filteredInventory = inventory.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Staff Header */}
            <header className="bg-slate-900 text-white p-4 md:px-8 shadow-xl flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">Shop Portal</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inventory & Sales</p>
                    </div>
                </div>
                <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
            </header>

            <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
                {/* Mobile Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <Button onClick={() => setIsScanning(true)} size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg">
                        <Scan className="h-8 w-8" />
                        <span className="font-bold uppercase text-xs">Scan to Sell</span>
                    </Button>
                    <Button onClick={() => document.getElementById('staff-camera-input')?.click()} variant="outline" size="lg" className="h-24 flex flex-col gap-2 rounded-[24px] shadow-lg border-2 border-primary/20 bg-white">
                        {isAnalyzing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <Camera className="h-8 w-8 text-primary" />}
                        <span className="font-bold uppercase text-xs text-primary">Capture New</span>
                    </Button>
                    <input type="file" id="staff-camera-input" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search items or Marker ID..." 
                        className="pl-9 h-12 rounded-2xl bg-white shadow-sm" 
                        value={searchTerm} 
                        onChange={e => setSearchQuery(e.target.value)} 
                    />
                </div>

                <Card className="rounded-[24px] shadow-sm overflow-hidden border-none">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Product</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></TableCell></TableRow>
                                ) : filteredInventory.map(item => (
                                    <TableRow key={item.id} className={cn(item.quantity === 0 && "bg-red-50/50")}>
                                        <TableCell>
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border bg-white">
                                                <Image src={item.imageDataUri} fill alt="p" className="object-cover" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <button onClick={() => setSelectedDetailItem(item)} className="font-bold text-left hover:text-primary transition-colors hover:underline flex items-center gap-1">
                                                    {item.name} <Info className="h-3 w-3 opacity-30" />
                                                </button>
                                                <Badge variant="outline" className="text-[8px] font-mono font-bold uppercase">{item.id.substring(0,8)}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                                                <span className={cn("font-bold text-lg", item.quantity === 0 ? "text-red-500" : "text-slate-700")}>{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => { setSelectedSaleItem(item); setSalePrice(item.mrp); setSaleQty(1); }} disabled={item.quantity === 0} className="rounded-xl">
                                                <DollarSign className="h-4 w-4 mr-1" /> Sell
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            {/* Dialogs: Scanner, Detail, Sale, Post-Sale */}
            <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogContent className="max-w-sm p-6 rounded-[32px]">
                    <DialogHeader><DialogTitle className="text-xl font-bold uppercase">Mobile Scanner</DialogTitle></DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-primary/20 min-h-[250px] bg-slate-100 flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Initializing camera...</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Product Detail Dialog */}
            <Dialog open={!!selectedDetailItem} onOpenChange={open => !open && setSelectedDetailItem(null)}>
                <DialogContent className="max-w-xl rounded-[32px] overflow-hidden p-0 border-none">
                    <div className="relative aspect-square w-full">
                        {selectedDetailItem?.imageDataUri && <Image src={selectedDetailItem.imageDataUri} fill className="object-cover" alt="p" />}
                        <Badge className="absolute top-6 left-6 bg-primary/90 text-white font-black italic">{selectedDetailItem?.category}</Badge>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <h3 className="text-3xl font-black italic uppercase leading-none">{selectedDetailItem?.name}</h3>
                            <p className="text-2xl font-black text-primary mt-2">MRP: ₹{selectedDetailItem?.mrp}</p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Sparkles className="h-3 w-3 text-purple-500" /> Sales Pitch</h4>
                            <ul className="space-y-1.5">
                                {selectedDetailItem?.sellingPoints?.map((p, i) => <li key={i} className="text-xs font-bold italic bg-purple-50 p-2 rounded-lg text-purple-900">"{p}"</li>)}
                            </ul>
                        </div>
                        <DialogClose asChild><Button className="w-full h-12 text-lg font-bold rounded-2xl">Close Details</Button></DialogClose>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Sale Dialog */}
            <Dialog open={!!selectedSaleItem} onOpenChange={open => !open && setSelectedSaleItem(null)}>
                <DialogContent className="max-w-md p-6 rounded-[32px]">
                    <DialogHeader><DialogTitle className="text-xl font-bold italic uppercase">Quick Sale</DialogTitle></DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Qty Sold</Label><Input type="number" value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} max={selectedSaleItem?.quantity} min={1} /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold opacity-60">Sale Price</Label><Input type="number" value={actualSellPrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs font-bold opacity-60">WhatsApp Number</Label><Input placeholder="Customer Mobile" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                        <Button onClick={handleSale} className="w-full h-12 text-lg font-bold rounded-2xl">Confirm Sale & Update Stock</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Post-Sale Dialog */}
            <Dialog open={showPostSaleDialog} onOpenChange={setShowPostSaleDialog}>
                <DialogContent className="max-w-sm p-8 text-center rounded-[32px]">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><CheckCircle2 className="h-10 w-10"/></div>
                        <div>
                            <h3 className="text-xl font-bold uppercase">Sale Confirmed!</h3>
                            <p className="text-sm text-muted-foreground">Stock updated successfully.</p>
                        </div>
                        <div className="w-full space-y-2">
                            {lastProcessedSale?.customerPhone && (
                                <Button onClick={sendWhatsAppInvoice} className="w-full h-12 bg-green-600 hover:bg-green-700 rounded-2xl font-bold">
                                    <MessageSquare className="mr-2 h-4 w-4" /> Send Invoice
                                </Button>
                            )}
                            <Button variant="outline" className="w-full h-12 rounded-2xl" onClick={() => setShowPostSaleDialog(false)}>
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}