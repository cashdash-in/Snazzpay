
'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ShieldCheck, CheckCircle2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCollection, saveDocument } from '@/services/firestore';
import { detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import type { InventoryItem, StockMovement } from '@/types/inventory';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const MAX_IMAGE_SIZE_PX = 800;

export default function StockAuditPage() {
    const { toast } = useToast();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [auditResults, setAuditResults] = useState<{product: InventoryItem, visualCount: number}[]>([]);

    useEffect(() => {
        getCollection<InventoryItem>('inventory').then(data => setInventory(data || []));
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

    const findProductMatch = (detectedName: string, items: InventoryItem[]) => {
        const dWords = new Set(detectedName.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const stage1 = items.find(i => {
            const name = i.name.toLowerCase();
            const detect = detectedName.toLowerCase();
            return name === detect || name.includes(detect) || detect.includes(name);
        });
        if (stage1) return stage1;

        let bestMatch = null;
        let highestScore = 0;
        for (const item of items) {
            const iWords = item.name.toLowerCase().split(/\s+/);
            const intersection = iWords.filter(w => dWords.has(w));
            if (intersection.length > highestScore && intersection.length >= 1) {
                highestScore = intersection.length;
                bestMatch = item;
            }
        }
        return bestMatch;
    };

    const handleAuditPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsAnalyzing(true);
        try {
            const uri = await resizeImage(file);
            const detections = await detectItemsInPhoto(uri, 'audit');
            
            if (!detections || detections.length === 0) {
                toast({ variant: 'destructive', title: "No Items Identified" });
                setIsAnalyzing(false);
                return;
            }

            const results = detections.map(d => {
                const match = findProductMatch(d.productName, inventory);
                return match ? { product: match, visualCount: d.count } : null;
            }).filter(r => !!r) as { product: InventoryItem, visualCount: number }[];
            
            setAuditResults(results);
            toast({ title: "Shelf Scan Complete" });
            setIsAnalyzing(false);
        } catch (e) { 
            console.error("Audit processing error:", e);
            toast({ variant: 'destructive', title: "Audit Failed" }); 
            setIsAnalyzing(false); 
        } finally {
            e.target.value = '';
        }
    };

    const handleExportAudit = () => {
        const data = auditResults.map(res => ({
            'Shelf': res.product.shelfNumber || 'N/A',
            'Product': res.product.name,
            'System Qty': res.product.quantity,
            'Visual Qty': res.visualCount,
            'Discrepancy': res.visualCount - res.product.quantity
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit");
        XLSX.writeFile(wb, `Shelf_Audit_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

    return (
        <AppShell title="Shelf-Wise Stock Audit">
            <div className="max-w-5xl mx-auto space-y-8">
                <Card className="rounded-[32px] bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                        <div className="p-4 bg-primary/20 rounded-full animate-pulse"><ShieldCheck className="h-12 w-12 text-primary" /></div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Visual Shelf Check</h2>
                            <p className="text-slate-400 text-sm">Snap a photo of any shelf. AI will count items and compare with system records.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button size="lg" className="h-16 px-10 rounded-2xl font-black uppercase italic shadow-2xl" onClick={() => document.getElementById('audit-cam-input')?.click()} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2 h-6 w-6" />} Start Shelf Scan
                            </Button>
                            {auditResults.length > 0 && (
                                <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl font-black uppercase italic border-white/10 text-white" onClick={handleExportAudit}>
                                    <FileSpreadsheet className="mr-2 h-6 w-6" /> Export Report
                                </Button>
                            )}
                        </div>
                        <input id="audit-cam-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAuditPhoto} />
                    </CardContent>
                </Card>

                {Object.entries(groupedAudit).map(([shelf, results]) => (
                    <Card key={shelf} className="rounded-[32px] shadow-xl border-none overflow-hidden bg-white mb-6 animate-in slide-in-from-bottom-4">
                        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between py-6 px-8">
                            <div className="flex items-center gap-4"><div className="p-3 bg-primary text-white rounded-2xl font-black italic shadow-lg">{shelf}</div><CardTitle className="text-lg font-black italic uppercase">Discrepancy: {shelf}</CardTitle></div>
                            <Badge className="bg-slate-900 text-xs px-4 py-1">{results.length} Matches Found</Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50"><TableRow><TableHead className="pl-8">Product</TableHead><TableHead className="text-center">System</TableHead><TableHead className="text-center text-primary font-black">Visual (AI)</TableHead><TableHead className="text-right pr-8">Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {results.map(res => {
                                        const diff = res.visualCount - res.product.quantity;
                                        return (
                                            <TableRow key={res.product.id} className={cn("hover:bg-slate-50", diff !== 0 && "bg-amber-50/20")}>
                                                <TableCell className="pl-8"><div className="flex items-center gap-3"><div className="relative h-10 w-10 border rounded-lg overflow-hidden"><Image src={res.product.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div><span className="font-bold uppercase text-xs italic">{res.product.name}</span></div></TableCell>
                                                <TableCell className="text-center font-bold text-slate-500">{res.product.quantity}</TableCell>
                                                <TableCell className="text-center font-black text-primary text-lg">{res.visualCount}</TableCell>
                                                <TableCell className="text-right pr-8">{diff === 0 ? <Badge className="bg-green-500 text-[10px] font-black uppercase"><CheckCircle2 className="h-3 w-3 mr-1"/> Correct</Badge> : <Badge variant="destructive" className="font-mono text-[10px] uppercase font-black bg-red-600">{diff > 0 ? 'Surplus' : 'Missing'}: {Math.abs(diff)}</Badge>}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="font-black italic uppercase text-slate-400 tracking-widest">AI is auditing your shelf...</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
