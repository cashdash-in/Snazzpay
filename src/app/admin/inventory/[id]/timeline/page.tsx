'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Loader2, ArrowLeft, History, TrendingUp, 
    TrendingDown, AlertCircle, ShoppingBag, 
    Truck, RefreshCcw, Package, ArrowRight
} from 'lucide-react';
import { getDocument, getCollection } from '@/services/firestore';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function StockTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadTimeline() {
            const id = params.id as string;
            if (!id) return;
            try {
                const [product, allMovements] = await Promise.all([
                    getDocument<InventoryItem>('inventory', id),
                    getCollection<StockMovement>('inventory_movements')
                ]);
                setItem(product);
                setMovements(allMovements.filter(m => m.productId === id).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
        loadTimeline();
    }, [params.id]);

    const stats = useMemo(() => {
        const sales = movements.filter(m => m.type === 'Sale').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
        const purchases = movements.filter(m => m.type === 'Purchase').reduce((sum, m) => sum + m.quantity, 0);
        const damages = movements.filter(m => m.type === 'Damage').reduce((sum, m) => sum + Math.abs(m.quantity), 0);
        return { sales, purchases, damages };
    }, [movements]);

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (!item) return <div className="p-20 text-center"><h1>Product Not Found</h1></div>;

    return (
        <AppShell title="Stock Intelligence">
            <div className="space-y-6 max-w-5xl mx-auto">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => router.back()}><ArrowLeft className="h-4 w-4"/></Button>
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{item.name}</h2>
                            <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">{item.category} • ID: {item.id.substring(0,8)}</p>
                        </div>
                    </div>
                    <Badge className="text-lg px-6 py-2 rounded-2xl font-black italic shadow-xl bg-slate-900">Current Stock: {item.quantity}</Badge>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-none shadow-lg bg-green-50">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-green-600 tracking-widest">Total Purchases</CardTitle></CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-3xl font-black text-green-800">+{stats.purchases}</div>
                            <Truck className="h-8 w-8 text-green-200" />
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-blue-50">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Total Sales</CardTitle></CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-3xl font-black text-blue-800">-{stats.sales}</div>
                            <ShoppingBag className="h-8 w-8 text-blue-200" />
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-red-50">
                        <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-600 tracking-widest">Total Damage/Loss</CardTitle></CardHeader>
                        <CardContent className="flex justify-between items-end">
                            <div className="text-3xl font-black text-red-800">-{stats.damages}</div>
                            <AlertCircle className="h-8 w-8 text-red-200" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-[32px] overflow-hidden border-none shadow-xl bg-white">
                    <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><History className="h-5 w-5" /></div>
                            <CardTitle className="text-base font-black italic uppercase">Inventory Timeline</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date & Time</TableHead><TableHead>Event</TableHead><TableHead>Quantity</TableHead><TableHead>Stock Path</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {movements.map(m => (
                                    <TableRow key={m.id} className="group hover:bg-slate-50 transition-colors">
                                        <TableCell className="text-xs font-medium">{format(parseISO(m.date), 'PP p')}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "uppercase text-[9px] font-black px-2",
                                                m.type === 'Sale' && "bg-blue-50 text-blue-700",
                                                m.type === 'Purchase' && "bg-green-50 text-green-700",
                                                m.type === 'Damage' && "bg-red-50 text-red-700"
                                            )}>{m.type}</Badge>
                                        </TableCell>
                                        <TableCell className={cn("font-black italic", m.quantity > 0 ? "text-green-600" : "text-red-600")}>
                                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                                        </TableCell>
                                        <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">
                                            {m.previousStock} <ArrowRight className="inline h-2 w-2" /> {m.newStock}
                                        </TableCell>
                                        <TableCell className="text-xs italic text-slate-500 max-w-xs truncate">{m.note || '-'}</TableCell>
                                    </TableRow>
                                ))}
                                {movements.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No movement records found for this SKU.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
