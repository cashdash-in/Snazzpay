
'use client';

import { useState, useEffect } from 'react';
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
                    const match = inventory.find(i => 
                        i.name.toLowerCase() === d.productName.toLowerCase() ||
                        i.name.toLowerCase().includes(d.productName.toLowerCase()) || 
                        d.productName.toLowerCase().includes(i.name.toLowerCase())
                    );
                    return match ? { product: match, visualCount: d.count } : null;
                }).filter(r => !!r) as { product: InventoryItem, visualCount: number }[];

                setAuditResults(results);
                toast({ 
                    title: "Shelf Scan Complete", 
                    description: `Detected ${results.length} products visually. Review the discrepancy report below.` 
                });
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
            <div className="max-w-5xl mx-auto space-y-8">
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
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-6 px-8">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-black italic uppercase flex items-center gap-2"><Layers className="text-primary"/> Audit Discrepancy Report</CardTitle>
                                <CardDescription>Detected {auditResults.length} unique products on shelf.</CardDescription>
                            </div>
                            <Badge className="bg-primary text-xs px-4 py-1">{auditResults.length} Items Audited</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="pl-8">Product Name</TableHead>
                                        <TableHead className="text-center">System Stock</TableHead>
                                        <TableHead className="text-center">Visual Count (AI)</TableHead>
                                        <TableHead className="text-right pr-8">Bifurcation / Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditResults.map(res => {
                                        const diff = res.visualCount - res.product.quantity;
                                        return (
                                            <TableRow key={res.product.id} className={cn("hover:bg-slate-50 transition-colors", diff !== 0 && "bg-amber-50/30")}>
                                                <TableCell className="pl-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold uppercase text-xs italic">{res.product.name}</span>
                                                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{res.product.category}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-500">{res.product.quantity}</TableCell>
                                                <TableCell className="text-center font-black text-primary">{res.visualCount}</TableCell>
                                                <TableCell className="text-right pr-8">
                                                    {diff === 0 ? (
                                                        <Badge className="bg-green-500 text-[10px] font-black uppercase"><CheckCircle2 className="h-3 w-3 mr-1"/> Correct</Badge>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                                                                {diff > 0 ? 'Surplus' : 'Missing'}: {Math.abs(diff)}
                                                            </Badge>
                                                            <span className="text-[9px] font-bold text-destructive uppercase tracking-widest">MISMATCH DETECTED</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="bg-slate-900 p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="text-slate-400 space-y-1">
                                <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Info className="h-4 w-4" /> Reconciliation Note</p>
                                <p className="text-[10px] max-w-xs leading-relaxed">Syncing will automatically record inventory adjustments and update your current stock to match the AI visual count.</p>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl h-14 px-8 text-slate-400 border-white/10" onClick={() => setAuditResults([])}>Discard Audit</Button>
                                <Button className="flex-2 sm:flex-none h-14 px-10 font-black uppercase italic rounded-xl shadow-2xl shadow-primary/20" onClick={handleApplyAdjustments} disabled={isProcessingAudit}>
                                    {isProcessingAudit ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />} Sync System with Visuals
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}

