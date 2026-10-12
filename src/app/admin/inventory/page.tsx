
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    Info,
    Sparkles,
    Copy,
    PackagePlus,
    AlertTriangle,
    X
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { format, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
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

const MAX_IMAGE_SIZE_PX = 600; // Aggressive compression for stability

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

    const [showNoAiDialog, setShowNoAiDialog] = useState(false);
    const [failedImageUri, setFailedImageUri] = useState<string | null>(null);

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

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new (window as any).Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_IMAGE_SIZE_PX) {
                            height *= MAX_IMAGE_SIZE_PX / width;
                            width = MAX_IMAGE_SIZE_PX;
                        }
                    } else {
                        if (height > MAX_IMAGE_SIZE_PX) {
                            width *= MAX_IMAGE_SIZE_PX / height;
                            height = MAX_IMAGE_SIZE_PX;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // High compression
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const getProductLink = (item: InventoryItem) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        return `${baseUrl}/catalogue?id=${item.id}&sellerId=admin&sellerName=Snazzify`;
    };

    const handleCopyLink = (item: InventoryItem) => {
        navigator.clipboard.writeText(getProductLink(item));
        toast({ title: "Link Copied!" });
    };

    const processImage = useCallback(async (file: File) => {
        setIsAnalyzing(true);
        try {
            const compressedUri = await resizeImage(file);
            setFailedImageUri(compressedUri);
            try {
                const aiData = await analyzeInventoryItem({ imageDataUri: compressedUri });
                const shortId = uuidv4().substring(0, 8).toUpperCase();
                const newItem: InventoryItem = {
                    id: shortId, name: aiData.productName, quantity: 1, wholesalePrice: 0, mrp: aiData.suggestedMRP,
                    shelfNumber: 'Pending', imageDataUri: compressedUri, category: aiData.category,
                    lastUpdated: new Date().toISOString(), description: aiData.description,
                    sellingPoints: aiData.sellingPoints, marketInsight: aiData.marketInsight, competitors: aiData.competitors,
                };
                await saveDocument('inventory', newItem, newItem.id);
                setInventory(prev => [newItem, ...prev]);
                toast({ title: 'Identified!', description: aiData.productName });
                setFailedImageUri(null);
            } catch (err) {
                setShowNoAiDialog(true);
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error' });
        } finally {
            setIsAnalyzing(false);
        }
    }, [toast]);

    const handleManualAdd = async () => {
        if (!failedImageUri) return;
        setIsAnalyzing(true);
        const id = uuidv4().substring(0, 8).toUpperCase();
        const newItem: InventoryItem = {
            id, name: "New Product", quantity: 1, wholesalePrice: 0, mrp: 0, shelfNumber: 'Pending',
            imageDataUri: failedImageUri, category: 'General', lastUpdated: new Date().toISOString(),
            description: '', sellingPoints: [], competitors: []
        };
        try {
            await saveDocument('inventory', newItem, id);
            setInventory(prev => [newItem, ...prev]);
            setShowNoAiDialog(false);
            setFailedImageUri(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Failed' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
        const updated = inventory.map(item => item.id === id ? { ...item, ...updates, lastUpdated: new Date().toISOString() } : item);
        setInventory(updated);
        const item = updated.find(i => i.id === id);
        if (item) await saveDocument('inventory', item, id);
    };

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
        <AppShell title="Shop Inventory">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Revenue</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black">₹{dailyPnL.revenue.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className={cn(dailyPnL.profit >= 0 ? "bg-green-600" : "bg-red-600", "text-white shadow-lg border-none")}>
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Profit</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black">₹{dailyPnL.profit.toFixed(2)}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/5">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sold</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-slate-800">{dailyPnL.itemsSold}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-primary/5">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">SKUs</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-slate-800">{inventory.length}</div></CardContent>
                    </Card>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-primary/5">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search..." className="pl-9" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsScanning(true)}><Scan className="mr-2 h-5 w-5" /> Scan to Sell</Button>
                        <Button onClick={() => document.getElementById('cam-in')?.click()} disabled={isAnalyzing}>
                             {isAnalyzing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Camera className="mr-2 h-4 w-4"/>} Capture New
                        </Button>
                        <input type="file" id="cam-in" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && processImage(e.target.files[0])} />
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                                                    <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                </div>
                                                <div>
                                                    <button onClick={() => setSelectedDetailItem(item)} className="font-bold hover:underline">{item.name}</button>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{item.id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>₹{item.mrp}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })}><Minus className="h-3 w-3" /></Button>
                                                <span className="font-bold">{item.quantity}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleCopyLink(item)}><Copy className="h-4 w-4" /></Button>
                                            <Button size="sm" disabled={item.quantity === 0} onClick={() => { setSelectedSaleItem(item); setSalePrice(item.mrp); }}>Sell</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Dialog open={!!selectedDetailItem} onOpenChange={o => !o && setSelectedDetailItem(null)}>
                    <DialogContent className="max-w-2xl">
                         {selectedDetailItem && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="relative aspect-square rounded-xl overflow-hidden"><Image src={selectedDetailItem.imageDataUri} fill className="object-cover" alt="p" unoptimized /></div>
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold">{selectedDetailItem.name}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedDetailItem.description}</p>
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold uppercase text-primary">Sales Hooks</h4>
                                        <ul className="space-y-1">{selectedDetailItem.sellingPoints?.map((p, i) => <li key={i} className="text-xs italic bg-slate-50 p-2 rounded">"{p}"</li>)}</ul>
                                    </div>
                                </div>
                            </div>
                         )}
                    </DialogContent>
                </Dialog>

                <Dialog open={showNoAiDialog} onOpenChange={setShowNoAiDialog}>
                    <DialogContent className="max-w-md text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                        <h3 className="text-xl font-bold">No Analytics Found</h3>
                        <p className="text-sm text-muted-foreground mt-2">AI couldn't identify this product. Add it manually?</p>
                        <DialogFooter className="mt-6">
                            <Button variant="outline" onClick={() => { setShowNoAiDialog(false); setFailedImageUri(null); }}>Discard</Button>
                            <Button onClick={handleManualAdd}>Add to List Anyway</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}
