'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ShieldCheck, CheckCircle2, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCollection } from '@/services/firestore';
import { detectItemsInPhoto } from '@/ai/flows/inventory-ai';
import type { InventoryItem } from '@/types/inventory';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';

const MAX_IMAGE_SIZE_PX = 800;

export default function PartnerStockAuditPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [auditResults, setAuditResults] = useState<{product: InventoryItem, visualCount: number}[]>([]);
    const partnerId = getCookie('snapstock_token') as string;

    useEffect(() => {
        if (!partnerId) return;
        getCollection<InventoryItem>('inventory').then(data => {
            setInventory(data.filter(i => i.storeId === partnerId));
        });
    }, [partnerId]);

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
        const detect = detectedName.toLowerCase().trim();
        return items.find(i => {
            const name = (i.name || '').toLowerCase().trim();
            return name === detect || name.includes(detect) || detect.includes(name);
        }) || null;
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
            toast({ title: "Shelf Audit Complete" });
        } catch (e) { 
            toast({ variant: 'destructive', title: "Audit Failed" }); 
        } finally {
            setIsAnalyzing(false);
            e.target.value = '';
        }
    };

    const handleExportAudit = () => {
        const data = auditResults.map(res => ({
            'Shelf': res.product.shelfNumber || 'N/A',
            'Product': res.product.name,
            'System Qty': res.product.quantity,
            'Visual (AI) Qty': res.visualCount,
            'Discrepancy': res.visualCount - res.product.quantity
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit");
        XLSX.writeFile(wb, `Stock_Audit_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
             <header className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-50">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5"/></Button>
                <div>
                    <h1 className="text-xl font-black italic uppercase tracking-tighter">Ziptally Audit</h1>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Compare physical stock vs system records</p>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
                <Card className="rounded-[32px] bg-slate-900 text-white overflow-hidden shadow-2xl">
                    <CardContent className="p-8 flex flex-col items-center text-center gap-6">
                        <div className="p-4 bg-blue-500/20 rounded-full animate-pulse border border-blue-500/30"><ShieldCheck className="h-12 w-12 text-blue-400" /></div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">AI Shelf Check</h2>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto">Snap a photo of your shelf. Ziptally AI will identify every item and find discrepancies.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button size="lg" className="h-16 px-10 rounded-2xl font-black uppercase italic bg-blue-600 hover:bg-blue-500 shadow-xl" onClick={() => document.getElementById('audit-cam')?.click()} disabled={isAnalyzing}>
                                {isAnalyzing ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : <Camera className="mr-2 h-6 w-6" />} Start Shelf Scan
                            </Button>
                            {auditResults.length > 0 && (
                                <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl font-black uppercase italic border-white/10 text-white" onClick={handleExportAudit}>
                                    <FileSpreadsheet className="mr-2 h-6 w-6" /> Export Report
                                </Button>
                            )}
                        </div>
                        <input id="audit-cam" type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAuditPhoto} />
                    </CardContent>
                </Card>

                {auditResults.length > 0 && (
                    <Card className="rounded-[32px] shadow-sm border-none bg-white overflow-hidden animate-in slide-in-from-bottom-4">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="pl-8">Article</TableHead>
                                    <TableHead className="text-center">System Qty</TableHead>
                                    <TableHead className="text-center text-blue-600 font-black">Visual (AI)</TableHead>
                                    <TableHead className="text-right pr-8">Audit Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditResults.map(res => {
                                    const diff = res.visualCount - res.product.quantity;
                                    return (
                                        <TableRow key={res.product.id} className={cn("hover:bg-slate-50", diff !== 0 && "bg-amber-50/20")}>
                                            <TableCell className="pl-8 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-10 w-10 rounded-lg overflow-hidden border"><Image src={res.product.imageDataUri} fill alt="p" className="object-cover" unoptimized /></div>
                                                    <div><p className="font-bold uppercase text-xs italic">{res.product.name}</p><Badge variant="outline" className="text-[8px] font-mono">{res.product.shelfNumber || 'A1'}</Badge></div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-slate-500">{res.product.quantity}</TableCell>
                                            <TableCell className="text-center font-black text-blue-600 text-lg">{res.visualCount}</TableCell>
                                            <TableCell className="text-right pr-8">
                                                {diff === 0 ? (
                                                    <Badge className="bg-green-500 text-[10px] font-black uppercase"><CheckCircle2 className="h-3 w-3 mr-1"/> Correct</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="font-mono text-[10px] uppercase font-black bg-red-600">
                                                        {diff > 0 ? 'Surplus' : 'Missing'}: {Math.abs(diff)}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                )}

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                        <p className="font-black italic uppercase text-slate-400 tracking-widest">AI is auditing your shelf...</p>
                    </div>
                )}
            </main>
        </div>
    );
}
