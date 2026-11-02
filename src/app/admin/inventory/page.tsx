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
    Loader2, Camera, Plus, Minus, Search, 
    ShieldCheck, Sparkles, Send, Mic, Trash2,
    X, PackagePlus, Scan, Map as MapIcon, List, CheckCircle2,
    Sun, Moon, Download, Printer, Layers, MessageSquare,
    FileText, FileCheck, FileUp, Zap, DollarSign, LayoutGrid
} from 'lucide-react';
import { getCollection, saveDocument, deleteDocument } from '@/services/firestore';
import { parseInventoryCommand, detectItemsInPhoto, matchProductToBill } from '@/ai/flows/inventory-ai';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import type { InventoryItem, StockMovement, MovementType } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_IMAGE_SIZE_PX = 800;

export default function AdminInventoryPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'list' | 'shop-map'>('list');
    
    // Bill Intake State
    const [isBillIntakeOpen, setIsBillIntakeOpen] = useState(false);
    const [billPhoto, setBillPhoto] = useState<string | null>(null);
    const [productPhoto, setProductPhoto] = useState<string | null>(null);
    const [isProcessingBill, setIsProcessingBill] = useState(false);

    // REAL-TIME SYNC
    useEffect(() => {
        if (!db) return;
        setIsLoading(true);
        const q = query(collection(db, 'inventory'), orderBy('lastUpdated', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data() } as InventoryItem));
            setInventory(data);
            setIsLoading(false);
        }, (error) => {
            console.error(error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

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

    const handleProcessBill = async () => {
        if (!billPhoto || !productPhoto) return;
        setIsProcessingBill(true);
        try {
            const result = await matchProductToBill(billPhoto, productPhoto);
            const id = uuidv4();
            const newItem = {
                id,
                storeId: 'admin',
                name: result.productName,
                quantity: result.quantity,
                wholesalePrice: result.wholesalePrice,
                mrp: result.mrp,
                category: result.category,
                shelfNumber: 'A1',
                imageDataUri: productPhoto,
                lastUpdated: new Date().toISOString()
            };
            await saveDocument('inventory', newItem, id);
            toast({ title: "Bill Processed", description: `Added ${result.quantity} units of ${result.productName}` });
            setIsBillIntakeOpen(false);
            setBillPhoto(null);
            setProductPhoto(null);
        } catch (e) {
            toast({ variant: 'destructive', title: "Bill Analysis Failed" });
        } finally {
            setIsProcessingBill(false);
        }
    };

    const recordMovement = async (item: InventoryItem, qty: number, type: MovementType, note?: string) => {
        const now = new Date().toISOString();
        const newQty = item.quantity + qty;
        const movement: StockMovement = {
            id: uuidv4(), productId: item.id, type, quantity: qty, date: now, note, previousStock: item.quantity, newStock: newQty
        };
        try {
            await Promise.all([
                saveDocument('inventory', { ...item, quantity: newQty, lastUpdated: now }, item.id),
                saveDocument('inventory_movements', movement, movement.id)
            ]);
            toast({ title: "Stock Updated" });
            return true;
        } catch (e) { return false; }
    };

    const shelfGroups = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        inventory.forEach(item => {
            const shelf = item.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(item);
        });
        return groups;
    }, [inventory]);

    const filteredInventory = inventory.filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppShell title="SnapStock AI Dashboard">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <Card className="bg-primary text-primary-foreground shadow-xl border-none md:col-span-1">
                        <CardHeader className="pb-2 flex flex-row justify-between items-center">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-70">Admin Tools</CardTitle>
                            <Sparkles className="h-4 w-4" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <Button size="sm" variant="secondary" className="w-full rounded-xl" onClick={() => setIsBillIntakeOpen(true)}>
                                <FileUp className="h-4 w-4 mr-2" /> Bill Intake
                             </Button>
                        </CardContent>
                    </Card>

                    <Link href="/admin/inventory/audit" className="md:col-span-1">
                        <Card className="hover:bg-slate-50 transition-colors shadow-lg border-none cursor-pointer h-full">
                            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Visual Audit</CardTitle></CardHeader>
                            <CardContent className="flex items-center gap-4"><div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><CheckCircle2 className="h-5 w-5" /></div><div className="text-xl font-bold italic">Shelf Check</div></CardContent>
                        </Card>
                    </Link>

                    <Card className="bg-slate-900 text-white shadow-xl border-none md:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Network Overview</CardTitle></CardHeader>
                        <CardContent className="flex justify-between items-center">
                            <div><p className="text-[10px] text-slate-500 uppercase font-bold">Global SKUs</p><p className="text-3xl font-black">{inventory.length}</p></div>
                            <div><p className="text-[10px] text-slate-500 uppercase font-bold">Network Value</p><p className="text-2xl font-black italic">₹{inventory.reduce((sum, i) => sum + (i.mrp * i.quantity), 0).toLocaleString()}</p></div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 shadow-inner border-none flex flex-col justify-center p-4 md:col-span-2">
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-1 text-center">View Mode</p>
                        <div className="flex bg-white rounded-xl p-1 border">
                            <Button variant={activeView === 'list' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('list')}>List</Button>
                            <Button variant={activeView === 'shop-map' ? 'default' : 'ghost'} size="sm" className="flex-1 h-8 rounded-lg text-[10px] uppercase font-bold" onClick={() => setActiveView('shop-map')}>Map</Button>
                        </div>
                    </Card>
                </div>

                <div className="relative px-2">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search global inventory..." className="pl-12 h-12 rounded-2xl bg-white shadow-sm border-none font-bold" value={searchTerm} onChange={e => setSearchQuery(e.target.value)} />
                </div>

                {activeView === 'list' ? (
                    <Card className="rounded-[32px] overflow-hidden shadow-sm border-none bg-white">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-8">Product</TableHead><TableHead>Loc</TableHead><TableHead>Rate (Purchase/Sell)</TableHead><TableHead>Stock</TableHead><TableHead className="text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredInventory.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border bg-slate-50"><Image src={item.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div><p className="font-bold italic uppercase">{item.name}</p><p className="text-[9px] font-mono opacity-50">{item.id.substring(0,8)}</p></div>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline">{item.shelfNumber}</Badge></TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-primary font-black">MRP: ₹{item.mrp}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cost: ₹{item.wholesalePrice}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => recordMovement(item, -1, 'Sale')}><Minus className="h-4 w-4" /></Button>
                                                    <span className={cn("font-black text-lg", item.quantity < 5 && "text-red-500")}>{item.quantity}</span>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => recordMovement(item, 1, 'Purchase')}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8 space-x-2">
                                                <Button variant="outline" size="sm" className="rounded-xl h-8 text-[10px] font-bold"><Printer className="h-3 w-3" /></Button>
                                                <Button variant="ghost" size="icon" className="text-red-300" onClick={() => deleteDocument('inventory', item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {Object.entries(shelfGroups).map(([shelf, items]) => (
                            <Card key={shelf} className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-4">
                                    <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-xl text-primary font-black italic">{shelf}</div><CardTitle className="text-sm font-black uppercase italic">Shelf {shelf}</CardTitle></div>
                                    <Badge className="bg-slate-900 text-[10px] font-black italic">Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}</Badge>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">{items.slice(0, 3).map(item => (<div key={item.id} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-100"><Image src={item.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized /><div className="flex-1 min-w-0"><p className="text-[11px] font-black uppercase italic truncate">{item.name}</p><p className="text-[9px] font-bold text-primary">MRP: ₹{item.mrp}</p></div></div>))}</CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* BILL INTAKE DIALOG */}
            <Dialog open={isBillIntakeOpen} onOpenChange={setIsBillIntakeOpen}>
                <DialogContent className="max-w-2xl rounded-[32px] p-8 border-none">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase text-slate-800">Admin Bill Intake</DialogTitle><DialogDescription>Match supplier bills to products across the platform.</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Supplier Bill</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('bill-admin')?.click()}>
                                {billPhoto ? <Image src={billPhoto} fill className="object-cover" alt="bill" /> : <><FileText className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Bill</span></>}
                            </div>
                            <input type="file" id="bill-admin" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setBillPhoto(await resizeImage(f)); }} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Product SKU</Label>
                            <div className="relative aspect-[3/4] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center bg-slate-50 cursor-pointer overflow-hidden" onClick={() => document.getElementById('prod-admin')?.click()}>
                                {productPhoto ? <Image src={productPhoto} fill className="object-cover" alt="prod" /> : <><Camera className="h-8 w-8 text-slate-300" /><span className="text-[8px] font-bold uppercase mt-2">Upload Product</span></>}
                            </div>
                            <input type="file" id="prod-admin" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if(f) setProductPhoto(await resizeImage(f)); }} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full h-14 rounded-2xl font-black uppercase italic bg-primary" onClick={handleProcessBill} disabled={isProcessingBill || !billPhoto || !productPhoto}>
                            {isProcessingBill ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2" />} Process Admin Intake
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    );
}
