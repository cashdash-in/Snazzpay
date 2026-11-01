
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Layers, MapPin, LayoutGrid, Info } from 'lucide-react';
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
                    const match = inventory.find(i => {
                        const nameA = i.name.toLowerCase();
                        const nameB = d.productName.toLowerCase();
                        return nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA);
                    });
                    return match ? { product: match, visualCount: d.count } : null;
                }).filter(r => !!r) as { product: InventoryItem, visualCount: number }[];

                setAuditResults(results);
                toast({ 
                    title: "Shelf Scan Complete", 
                    description: `Detected ${results.length} products visually. Review the shelf report below.` 
                });
            };
            reader.readAsDataURL(file);
        } catch (e) {
            toast({ variant: 'destructive', title: "Audit Failed" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const groupedAudit = useMemo(() => {
        const groups: Record<string, typeof auditResults> = {};
        auditResults.forEach(res => {
            const shelf = res.product.shelfNumber || 'Unassigned';
            if (!groups[shelf]) groups[shelf] = [];
            groups[shelf].push(res);
        });
        return groups;
    }, [auditResults]);

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
                        note: `Shelf Audit [${res.product.shelfNumber}]: ${diff > 0 ? '+' : ''}${diff}`,
                        previousStock: res.product.quantity,
                        newStock: res.visualCount
                    };
                    await Promise.all([
                        saveDocument('inventory', { ...res.product, quantity: res.visualCount, lastUpdated: now }, res.product.id),
                        saveDocument('inventory_movements', movement, movement.id)
                    ]);
                }
            }
            toast({ title: "Inventory Reconciled!", description: "All system counts updated by shelf location." });
            setAuditResults([]);
        } catch (e) {
            toast({ variant: 'destructive', title: "Adjustment Failed" });
        } finally {
            setIsProcessingAudit(false);
        }
    };

    return (
        <AppShell title="Shelf-Wise Stock Audit">
            <div className="max-w-5xl mx-auto space-y-8">
                <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-12 flex flex-col items-center text-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-full border border-primary/20 animate-pulse"><ShieldCheck className="h-12 w-12 text-primary" /></div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Visual Shelf Check</h2>
                            <p className="text-slate-400 text-sm max-w-sm">Snap a photo of any shelf section. AI will count items and verify they are in the correct location.</p>
                        </div>
                        <Button size="lg" className="h-16 px-10 rounded-2xl font-black uppercase italic text-lg shadow-2xl shadow-primary/20" onClick={() => document.getElementById('audit-cam-input')?.click()}>
                            {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2 h-6 w-6" />} Start Shelf Scan
                        </Button>
                        <input id="audit-cam-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAuditPhoto} />
                    </CardContent>
                </Card>

                {Object.entries(groupedAudit).map(([shelf, results]) => (
                    <Card key={shelf} className="rounded-[32px] shadow-xl border-none overflow-hidden animate-in slide-in-from-bottom-4 duration-500 bg-white mb-6">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-6 px-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary text-white rounded-2xl font-black italic shadow-lg">{shelf}</div>
                                <div>
                                    <CardTitle className="text-lg font-black italic uppercase">Shelf Discrepancy Report</CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Location Tracking Accuracy</CardDescription>
                                </div>
                            </div>
                            <Badge className="bg-slate-900 text-xs px-4 py-1">{results.length} Items Found</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="pl-8">Product Details</TableHead>
                                        <TableHead className="text-center">System</TableHead>
                                        <TableHead className="text-center text-primary font-black">Visual (AI)</TableHead>
                                        <TableHead className="text-right pr-8">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map(res => {
                                        const diff = res.visualCount - res.product.quantity;
                                        return (
                                            <TableRow key={res.product.id} className={cn("hover:bg-slate-50 transition-colors", diff !== 0 && "bg-amber-50/20")}>
                                                <TableCell className="pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <Image src={res.product.imageDataUri} width={32} height={32} alt="p" className="rounded-lg object-cover" unoptimized />
                                                        <div className="flex flex-col">
                                                            <span className="font-bold uppercase text-xs italic">{res.product.name}</span>
                                                            <span className="text-[9px] font-mono text-muted-foreground uppercase">ID: {res.product.id.substring(0,8)}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-slate-500">{res.product.quantity}</TableCell>
                                                <TableCell className="text-center font-black text-primary text-lg">{res.visualCount}</TableCell>
                                                <TableCell className="text-right pr-8">
                                                    {diff === 0 ? (
                                                        <Badge className="bg-green-500 text-[10px] font-black uppercase"><CheckCircle2 className="h-3 w-3 mr-1"/> Matches</Badge>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-1">
                                                            <Badge variant="destructive" className="font-mono text-[10px] uppercase font-black">
                                                                {diff > 0 ? 'Surplus' : 'Missing'}: {Math.abs(diff)}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}

                {auditResults.length > 0 && (
                    <Card className="rounded-[32px] bg-slate-900 text-white p-8 shadow-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-primary"><RefreshCw className="h-4 w-4 animate-spin-slow" /> Global Sync Ready</p>
                                <p className="text-[10px] text-slate-400 max-w-sm">Reconciliation will record inventory adjustments across all shelves to match the visual counts detected by AI.</p>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl h-14 px-8 text-slate-400 border-white/10 hover:bg-white/5" onClick={() => setAuditResults([])}>Discard Audit</Button>
                                <Button className="flex-2 sm:flex-none h-14 px-10 font-black uppercase italic rounded-xl shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90" onClick={handleApplyAdjustments} disabled={isProcessingAudit}>
                                    {isProcessingAudit ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2 h-5 w-5" />} Sync System with Shelves
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </AppShell>
    );
}
