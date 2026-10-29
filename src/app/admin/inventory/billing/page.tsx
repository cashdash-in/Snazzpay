
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
    Loader2, Search, ShoppingCart, Trash2, 
    CheckCircle2, Printer, Plus, Minus,
    FileText, User, Receipt, MapPin, LayoutGrid
} from 'lucide-react';
import { getCollection, saveDocument } from '@/services/firestore';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function BillingModePage() {
    const { toast } = useToast();
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [cart, setCart] = useState<{product: InventoryItem, qty: number}[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [customerName, setCustomerName] = useState('');

    useEffect(() => {
        getCollection<InventoryItem>('inventory').then(data => {
            setInventory(data || []);
            setIsLoading(false);
        });
    }, []);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return [];
        const lowerSearch = searchTerm.toLowerCase();
        return inventory.filter(p => 
            (p.name.toLowerCase().includes(lowerSearch) || p.shelfNumber?.toLowerCase().includes(lowerSearch) || p.id.toLowerCase().includes(lowerSearch)) 
            && p.quantity > 0
        );
    }, [searchTerm, inventory]);

    const addToCart = (product: InventoryItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) return prev.map(i => i.product.id === product.id ? {...i, qty: i.qty + 1} : i);
            return [...prev, { product, qty: 1 }];
        });
        setSearchTerm('');
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.product.mrp * item.qty), 0);

    const handleCompleteSale = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            const now = new Date().toISOString();
            for (const item of cart) {
                const newQty = item.product.quantity - item.qty;
                const movement: StockMovement = {
                    id: uuidv4(),
                    productId: item.product.id,
                    type: 'Sale',
                    quantity: -item.qty,
                    date: now,
                    note: `Store Billing: ${customerName || 'Walk-in Customer'}`,
                    previousStock: item.product.quantity,
                    newStock: newQty
                };
                await Promise.all([
                    saveDocument('inventory', { ...item.product, quantity: newQty, lastUpdated: now }, item.product.id),
                    saveDocument('inventory_movements', movement, movement.id)
                ]);
            }
            toast({ title: "Sale Completed!", description: "Stock updated automatically." });
            setCart([]);
            setCustomerName('');
        } catch (error) {
            toast({ variant: 'destructive', title: "Sale Failed" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AppShell title="Billing & Checkout">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[32px] shadow-sm border-none bg-white">
                        <CardHeader><CardTitle className="italic font-black uppercase text-xl tracking-tighter">Create Invoice</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    placeholder="Search product name, ID or Shelf (e.g. A1)..." 
                                    className="pl-12 h-14 rounded-2xl border-2 bg-slate-50 focus-visible:bg-white transition-all text-sm font-bold" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {filteredProducts.length > 0 && (
                                    <div className="absolute top-16 left-0 right-0 z-50 bg-white border rounded-[28px] shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                        {filteredProducts.map(p => (
                                            <button key={p.id} className="w-full text-left p-4 hover:bg-slate-50 flex items-center gap-4 border-b last:border-none transition-colors group" onClick={() => addToCart(p)}>
                                                <div className="relative h-12 w-12 rounded-xl overflow-hidden border shrink-0"><Image src={p.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                <div className="flex-1">
                                                    <p className="font-black text-sm uppercase italic group-hover:text-primary transition-colors">{p.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black italic px-2 py-0 h-4">₹{p.mrp}</Badge>
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 px-2 h-4"><MapPin className="h-2 w-2 mr-1" /> {p.shelfNumber}</Badge>
                                                        <span className="text-[10px] text-muted-foreground font-bold">Stock: {p.quantity}</span>
                                                    </div>
                                                </div>
                                                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all"><Plus className="h-5 w-5" /></div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Table>
                                <TableHeader className="bg-slate-50/50"><TableRow><TableHead>Article & Location</TableHead><TableHead className="text-center">Qty</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.product.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black uppercase text-[11px] italic leading-none">{item.product.name}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 flex items-center gap-1"><LayoutGrid className="h-2 w-2" /> SHELF: {item.product.shelfNumber}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-3">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-100" onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))}><Minus className="h-3.5 w-3.5 text-slate-400"/></Button>
                                                    <span className="font-black text-sm">{item.qty}</span>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-100" onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? {...i, qty: Math.min(item.product.quantity, i.qty + 1)} : i))}><Plus className="h-3.5 w-3.5 text-primary"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-bold text-sm text-slate-600">₹{item.product.mrp}</TableCell>
                                            <TableCell className="text-right font-black text-sm text-primary">₹{item.product.mrp * item.qty}</TableCell>
                                        </TableRow>
                                    ))}
                                    {cart.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic font-medium opacity-50">Add products to start building your bill.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-[32px] shadow-2xl border-none bg-slate-900 text-white sticky top-24 overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Receipt className="h-24 w-24" /></div>
                        <CardHeader className="relative z-10"><CardTitle className="text-lg font-black italic uppercase tracking-widest text-primary flex items-center gap-2"><Receipt className="h-5 w-5"/> Checkout Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-6 relative z-10">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Customer Name (Optional)</Label>
                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input className="pl-9 h-12 bg-white/5 border-white/10 rounded-2xl text-white font-bold" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                            </div>
                            <div className="space-y-3 border-t border-white/10 pt-6">
                                <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-widest"><span>Items Subtotal</span><span>₹{cartTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase text-slate-500 mb-1">Payable Now</span>
                                    <span className="text-5xl font-black italic tracking-tighter text-white leading-none">₹{cartTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3 pb-8 relative z-10">
                             <Button className="w-full h-16 text-2xl font-black uppercase italic rounded-[24px] shadow-[0_20px_50px_rgba(90,49,244,0.3)] bg-primary hover:bg-primary/90 hover:scale-[1.02] transition-all" onClick={handleCompleteSale} disabled={cart.length === 0 || isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin h-8 w-8" /> : "Finalize Sale"}
                            </Button>
                            <Button variant="ghost" className="w-full text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest" onClick={() => router.back()}>Cancel & Go Back</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}

