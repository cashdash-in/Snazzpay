'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCollection, saveDocument } from '@/services/firestore';
import { detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function StockAuditPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [auditResults, setAuditResults] = useState<{product: InventoryItem, visualCount: number}[]>([]);
    const [isProcessingAudit, setIsProcessingAudit] = useState(false);

    useEffect(() => {
        getCollection<InventoryItem>('inventory').then(data => setInventory(data || []));
    }, []);

    const handleAuditPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        setAuditResults([]);
        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const uri = ev.target?.result as string;
                const detections = await detectItemsInPhoto(uri, 'audit');
                
                const results = detections.map(d => {
                    const match = inventory.find(i => i.name.toLowerCase().includes(d.productName.toLowerCase()) || d.productName.toLowerCase().includes(i.name.toLowerCase()));
                    return match ? { product: match, visualCount: d.count } : null;
                }).filter(r => !!r) as { product: InventoryItem, visualCount: number }[];

                setAuditResults(results);
                toast({ title: "Shelf Scan Complete", description: `Detected ${results.length} products visually.` });
            };
            reader.readAsDataURL(file);
        } catch (e) {
            toast({ variant: 'destructive', title: "Audit Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyAdjustments = async () => {
        setIsProcessingAudit(true);
        try {
            const now = new Date().toISOString();
            for (const res of auditResults) {
                const diff = res.visualCount - res.product.quantity;
                if (diff !== 0) {
                    const movement: StockMovement = {
                        id: uuidv4(),
                        productId: res.product.id,
                        type: 'Adjustment',
                        quantity: diff,
                        date: now,
                        note: `Weekly AI Audit Discrepancy: ${diff > 0 ? '+' : ''}${diff}`,
                        previousStock: res.product.quantity,
                        newStock: res.visualCount
                    };
                    await Promise.all([
                        saveDocument('inventory', { ...res.product, quantity: res.visualCount, lastUpdated: now }, res.product.id),
                        saveDocument('inventory_movements', movement, movement.id)
                    ]);
                }
            }
            toast({ title: "Inventory Reconciled!", description: "All system counts now match visual counts." });
            setAuditResults([]);
        } catch (e) {
            toast({ variant: 'destructive', title: "Adjustment Failed" });
        } finally {
            setIsProcessingAudit(false);
        }
    };

    return (
        <AppShell title="Stock Audit Mode">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-12 flex flex-col items-center text-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-full border border-primary/20 animate-pulse"><ShieldCheck className="h-12 w-12 text-primary" /></div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Weekly Visual Audit</h2>
                            <p className="text-slate-400 text-sm max-w-sm">Snap a photo of your shelves. AI will count the items and highlight any discrepancies with the system.</p>
                        </div>
                        <Button size="lg" className="h-16 px-10 rounded-2xl font-black uppercase italic text-lg" onClick={() => document.getElementById('audit-cam')?.click()}>
                            {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2 h-6 w-6" />} Start Visual Check
                        </Button>
                        <input id="audit-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAuditPhoto} />
                    </CardContent>
                </Card>

                {auditResults.length > 0 && (
                    <Card className="rounded-[32px] shadow-2xl border-2 border-primary/10 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black italic uppercase flex items-center gap-2"><Layers className="text-primary"/> Audit Report</CardTitle>
                            <Badge className="bg-primary">{auditResults.length} Items Found</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-center">System Count</TableHead><TableHead className="text-center">Visual Count</TableHead><TableHead className="text-right">Difference</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {auditResults.map(res => {
                                        const diff = res.visualCount - res.product.quantity;
                                        return (
                                            <TableRow key={res.product.id} className={cn(diff !== 0 && "bg-amber-50/50")}>
                                                <TableCell className="font-bold uppercase text-xs italic">{res.product.name}</TableCell>
                                                <TableCell className="text-center font-bold">{res.product.quantity}</TableCell>
                                                <TableCell className="text-center font-black text-primary">{res.visualCount}</TableCell>
                                                <TableCell className="text-right">
                                                    {diff === 0 ? (
                                                        <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1"/> Correct</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="font-mono">{diff > 0 ? '+' : ''}{diff} DISCREPANCY</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="bg-slate-900 p-6 flex justify-between gap-4">
                            <Button variant="outline" className="flex-1 rounded-xl h-12 text-slate-400 border-white/10" onClick={() => setAuditResults([])}>Discard Audit</Button>
                            <Button className="flex-2 h-12 px-8 font-black uppercase italic rounded-xl" onClick={handleApplyAdjustments} disabled={isProcessingAudit}>
                                {isProcessingAudit ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />} Sync System with Visuals
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
