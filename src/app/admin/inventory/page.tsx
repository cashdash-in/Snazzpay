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
    Scan, PackagePlus, AlertTriangle, Copy, 
    DollarSign, Mic, MessageSquare, History,
    ShoppingCart, ShieldCheck, ArrowRight,
    TrendingUp, FileSpreadsheet, Trash2,
    Sparkles, Send
} from 'lucide-react';
import { getCollection, saveDocument, addDocument } from '@/services/firestore';
import { analyzeInventoryItem } from '@/ai/flows/inventory-analyzer';
import { parseInventoryCommand, detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { cn, sanitizePhoneNumber } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const MAX_IMAGE_SIZE_PX = 600;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    
    // AI Interaction States
    const [isListening, setIsListening] = useState(false);
    const [isVisionProcessing, setIsVisionProcessing] = useState(false);
    const [textCommand, setTextCommand] = useState('');
    const [detectedSaleItems, setDetectedSaleItems] = useState<{productName: string, qty: number}[]>([]);

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

    /**
     * Records a stock movement and updates the inventory atomicity (formula-based).
     */
    const recordMovement = async (item: InventoryItem, qty: number, type: MovementType, note?: string) => {
        const newQty = item.quantity + qty;
        const movement: StockMovement = {
            id: uuidv4(),
            productId: item.id,
            type,
            quantity: qty,
            date: new Date().toISOString(),
            note,
            previousStock: item.quantity,
            newStock: newQty
        };

        try {
            await Promise.all([
                saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: movement.date }, item.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            
            setInventory(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    };

    const handleTextCommand = async (command: string) => {
        setIsAnalyzing(true);
        try {
            const result = await parseInventoryCommand(command);
            setDetectedSaleItems(result.items.map(i => ({ productName: i.productName, qty: i.quantity })));
            setTextCommand('');
            toast({ title: "AI Detected Items", description: result.summary });
        } catch (e) {
            toast({ variant: 'destructive', title: "Parsing Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePhotoSale = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsVisionProcessing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'sale');
            setDetectedSaleItems(detections.map(d => ({ productName: d.productName, qty: -d.count })));
            toast({ title: "Photo Analyzed", description: `Found ${detections.length} types of items.` });
        } catch (e) {
            toast({ variant: 'destructive', title: "Vision Error" });
        } finally {
            setIsVisionProcessing(false);
        }
    };

    const finalizeBulkSale = async () => {
        setIsAnalyzing(true);
        let successCount = 0;
        for (const sale of detectedSaleItems) {
            const item = inventory.find(i => i.name.toLowerCase().includes(sale.productName.toLowerCase()) || sale.productName.toLowerCase().includes(i.name.toLowerCase()));
            if (item) {
                const type = sale.qty < 0 ? 'Sale' : 'Purchase';
                const ok = await recordMovement(item, sale.qty, type as MovementType, "AI Detected Capture");
                if (ok) successCount++;
            }
        }
        toast({ title: "Bulk Update Complete", description: `Updated ${successCount} products in stock.` });
        setDetectedSaleItems([]);
        setIsAnalyzing(false);
    };

    const filteredInventory = inventory.filter(i => 
        (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isMounted) return null;

    return (
        <AppShell title="Shop Inventory">
            <div className="space-y-6">
                {/* Header Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Inventory Intelligence</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => setIsListening(true)}>
                                    <Mic className="h-4 w-4 mr-2" /> Voice
                                </Button>
                                <Button size="sm" variant="secondary" className="flex-1 rounded-xl" onClick={() => document.getElementById('sale-photo')?.click()}>
                                    {isVisionProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Camera className="h-4 w-4 mr-2" />} Photo
                                </Button>
                                <input type="file" id="sale-photo" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSale} />
                             </div>
                        </CardContent>
                    </Card>
                    <Link href="/admin/inventory/billing">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Billing Mode</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart /></div>
                                <div className="text-xl font-bold">New Invoice</div>
                            </CardContent>
                        </Link>
                    </Link>
                    <Link href="/admin/inventory/audit">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Audit Mode</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><ShieldCheck /></div>
                                <div className="text-xl font-bold">Shelf Check</div>
                            </CardContent>
                        </Link>
                    </Link>
                    <Card className="bg-slate-900 text-white shadow-xl border-none">
                         <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total SKUs</CardTitle></CardHeader>
                         <CardContent><div className="text-3xl font-black">{inventory.length}</div></CardContent>
                    </Card>
                </div>

                {/* WhatsApp-Style Text Input */}
                <Card className="rounded-3xl shadow-sm border-none bg-white p-2">
                    <div className="flex gap-2 p-2">
                        <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><MessageSquare className="h-6 w-6" /></div>
                        <Input 
                            placeholder="Type sale: 'Sold 2 rosaries, 1 candle' or paste text here..." 
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

                {/* AI Detection Confirmation */}
                {detectedSaleItems.length > 0 && (
                    <Card className="border-2 border-primary bg-primary/5 rounded-[32px] animate-in fade-in slide-in-from-top-4">
                        <CardHeader><CardTitle className="text-lg flex items-center gap-2 italic font-black"><Sparkles className="text-primary"/> Confirm Stock Movement</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {detectedSaleItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border">
                                        <div className="flex items-center gap-3">
                                            <Badge variant={item.qty < 0 ? 'destructive' : 'default'} className="rounded-full w-8 h-8 p-0 flex items-center justify-center font-bold">
                                                {item.qty > 0 ? '+' : ''}{item.qty}
                                            </Badge>
                                            <span className="font-bold uppercase text-xs">{item.productName}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setDetectedSaleItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" className="flex-1 rounded-2xl" onClick={() => setDetectedSaleItems([])}>Discard</Button>
                            <Button className="flex-1 rounded-2xl h-12 text-lg font-black" onClick={finalizeBulkSale}>Confirm & Update Stock</Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Inventory Table */}
                <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                    <div className="p-6 border-b flex justify-between items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search..." className="pl-9 h-10 rounded-xl" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50"><TableRow><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead>In Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {filteredInventory.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50">
                                                    <Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized />
                                                </div>
                                                <div>
                                                    <Link href={`/admin/inventory/${item.id}/timeline`} className="font-bold hover:underline hover:text-primary transition-colors uppercase italic">{item.name}</Link>
                                                    <p className="text-[9px] text-muted-foreground font-mono tracking-widest">{item.category}</p>
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
                                            <Dialog>
                                                <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-xl"><AlertTriangle className="h-4 w-4 mr-2" /> Damage</Button></DialogTrigger>
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
                                                                const qty = parseInt((document.getElementById(`qty-loss-${item.id}`) as HTMLInputElement).value) || 0;
                                                                const reason = (document.getElementById(`reason-loss-${item.id}`) as HTMLInputElement).value || 'Damage';
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
        </AppShell>
    );
}
