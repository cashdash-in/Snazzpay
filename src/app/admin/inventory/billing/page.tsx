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
    FileText, User, Receipt
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
        return inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.quantity > 0);
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
        <AppShell title="Billing Mode">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-[32px] shadow-sm">
                        <CardHeader><CardTitle className="italic font-black uppercase">Create Bill</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search product to add..." 
                                    className="pl-10 h-12 rounded-2xl border-2" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {filteredProducts.length > 0 && (
                                    <div className="absolute top-14 left-0 right-0 z-50 bg-white border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                                        {filteredProducts.map(p => (
                                            <button key={p.id} className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 border-b last:border-none" onClick={() => addToCart(p)}>
                                                <Image src={p.imageDataUri} width={40} height={40} alt="p" className="rounded-lg object-cover" />
                                                <div className="flex-1">
                                                    <p className="font-bold text-xs uppercase">{p.name}</p>
                                                    <p className="text-[10px] text-primary font-bold">₹{p.mrp} • Stock: {p.quantity}</p>
                                                </div>
                                                <Plus className="h-4 w-4 text-slate-300" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Table>
                                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.product.id}>
                                            <TableCell className="font-bold uppercase text-xs">{item.product.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))}><Minus className="h-3 w-3"/></Button>
                                                    <span className="font-bold">{item.qty}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? {...i, qty: Math.min(item.product.quantity, i.qty + 1)} : i))}><Plus className="h-3 w-3"/></Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>₹{item.product.mrp}</TableCell>
                                            <TableCell className="text-right font-bold">₹{item.product.mrp * item.qty}</TableCell>
                                        </TableRow>
                                    ))}
                                    {cart.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">Add products to start billing.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-[32px] shadow-xl border-primary/20 bg-slate-900 text-white sticky top-24">
                        <CardHeader><CardTitle className="text-lg font-black italic uppercase tracking-widest text-primary flex items-center gap-2"><Receipt className="h-5 w-5"/> Final Settlement</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Customer Name (Optional)</Label>
                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input className="pl-9 h-11 bg-white/5 border-white/10 rounded-xl text-white" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                            </div>
                            <div className="space-y-2 border-t border-white/10 pt-4">
                                <div className="flex justify-between text-slate-400 text-sm"><span>Subtotal</span><span>₹{cartTotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-2xl font-black italic tracking-tighter"><span>Grand Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                             <Button className="w-full h-14 text-xl font-black uppercase italic rounded-2xl shadow-2xl" onClick={handleCompleteSale} disabled={cart.length === 0 || isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin" /> : "Complete Sale"}
                            </Button>
                            <Button variant="ghost" className="w-full text-slate-400 hover:text-white" onClick={() => router.back()}>Cancel & Go Back</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
