'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getDocument, saveDocument } from "@/services/firestore";
import { Loader2, CheckCircle2, XCircle, Send, ImagePlus, RefreshCw, ShieldCheck, Factory, BookOpen, Layers, Info, Check, Download, FileSpreadsheet } from "lucide-react";
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WholesaleInquiry, WholesaleItem, AlternateProduct } from '@/types/wholesale';
import * as XLSX from 'xlsx';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

function WholesaleResponseContent() {
    const params = useParams();
    const { toast } = useToast();
    const [inquiry, setInquiry] = useState<WholesaleInquiry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeItem, setActiveItem] = useState<WholesaleItem | null>(null);

    // Form State for the item being edited in Dialog
    const [response, setResponse] = useState({
        availability: 'Available' as 'Available' | 'Out of Stock',
        wholesalePrice: '',
        estimatedMRP: '',
        description: '',
    });

    const [alternate, setAlternate] = useState<AlternateProduct>({
        title: '',
        imageDataUri: '',
        wholesalePrice: 0,
        estimatedMRP: 0,
        availableQuantity: 0,
        description: '',
        length: '',
        breadth: '',
        height: '',
    });

    useEffect(() => {
        async function loadInquiry() {
            const id = params.id as string;
            if (!id) return;
            try {
                const data = await getDocument<WholesaleInquiry>('wholesale_inquiries', id);
                if (data) setInquiry(data);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load magazine details.' });
            } finally {
                setIsLoading(false);
            }
        }
        loadInquiry();
    }, [params.id, toast]);

    const handleOpenUpdate = (item: WholesaleItem) => {
        setActiveItem(item);
        setResponse({
            availability: item.status === 'Alternate Proposed' ? 'Out of Stock' : 'Available',
            wholesalePrice: item.wholesalePrice?.toString() || '',
            estimatedMRP: item.estimatedMRP?.toString() || '',
            description: item.vendorDescription || '',
        });
        if (item.alternateProduct) {
            setAlternate(item.alternateProduct);
        } else {
            setAlternate({ title: '', imageDataUri: '', wholesalePrice: 0, estimatedMRP: 0, availableQuantity: 0, description: '', length: '', breadth: '', height: '' });
        }
    };

    const handleSaveItemResponse = async () => {
        if (!inquiry || !activeItem) return;

        const isOOS = response.availability === 'Out of Stock';
        const wPrice = parseFloat(response.wholesalePrice) || 0;
        const mPrice = parseFloat(response.estimatedMRP) || 0;

        if (!isOOS && (!response.wholesalePrice || !response.estimatedMRP)) {
            toast({ variant: 'destructive', title: "Pricing Required" });
            return;
        }

        if (isOOS && !alternate.imageDataUri) {
            toast({ variant: 'destructive', title: "Alternate Required", description: "Please upload an image for the alternate product." });
            return;
        }

        setIsSaving(true);
        try {
            const itemIndex = inquiry.items.findIndex(it => it.id === activeItem.id);
            if (itemIndex === -1) throw new Error("Article not found.");

            const updatedItems = [...(inquiry.items || [])];
            const itemUpdate: any = {
                ...activeItem,
                status: isOOS ? 'Alternate Proposed' : 'Available',
                vendorDescription: response.description || '',
            };

            if (isOOS) {
                itemUpdate.alternateProduct = {
                    ...alternate,
                    title: alternate.title || 'Alternate Product',
                    wholesalePrice: Number(alternate.wholesalePrice) || 0,
                    estimatedMRP: Number(alternate.estimatedMRP) || 0,
                    availableQuantity: Number(alternate.availableQuantity) || 0,
                    category: activeItem.category
                };
                itemUpdate.wholesalePrice = null;
                itemUpdate.estimatedMRP = null;
            } else {
                itemUpdate.wholesalePrice = wPrice;
                itemUpdate.estimatedMRP = mPrice;
                itemUpdate.alternateProduct = null;
            }

            updatedItems[itemIndex] = itemUpdate;
            const updatePayload = { items: updatedItems, updatedAt: new Date().toISOString(), isReadByAdmin: false };

            await saveDocument('wholesale_inquiries', updatePayload, inquiry.id);
            setInquiry({ ...inquiry, ...updatePayload });
            
            toast({ title: "Quote Saved!" });
            setActiveItem(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Save Failed" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportMyQuotes = () => {
        if (!inquiry) return;
        const data = inquiry.items.map(item => ({
            'Article': item.category,
            'Status': item.status,
            'Confirmed': item.isConfirmedByAdmin ? 'YES' : 'PENDING',
            'My Wholesale Price (₹)': item.status === 'Available' ? item.wholesalePrice : (item.status === 'Alternate Proposed' ? item.alternateProduct?.wholesalePrice : 'N/A'),
            'My MRP Suggestion (₹)': item.status === 'Available' ? item.estimatedMRP : (item.status === 'Alternate Proposed' ? item.alternateProduct?.estimatedMRP : 'N/A'),
            'Alternate Offered': item.alternateProduct?.title || 'None',
            'My Note': item.vendorDescription || '',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'My Wholesale Quotes');
        XLSX.writeFile(wb, `My_Quotes_${inquiry.title.replace(/\s+/g, '_')}.xlsx`);
    };

    const handleAltImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setAlternate(prev => ({ ...prev, imageDataUri: ev.target?.result as string }));
            reader.readAsDataURL(file);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
    
    if (!inquiry) return <div className="p-20 text-center"><h1 className="text-2xl font-bold">Magazine Not Found</h1></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 md:px-8 shadow-sm">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-lg md:text-2xl font-black tracking-tighter italic uppercase text-slate-900">{inquiry.title}</h1>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Live Wholesale Inquiry</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full text-[10px] font-black uppercase tracking-widest h-9" onClick={handleExportMyQuotes}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Download My Quote List
                    </Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <h2 className="text-3xl font-black italic uppercase tracking-tight">Pricing Feed</h2>
                            <p className="text-slate-400 text-sm max-w-md">Review the articles and click each one to provide your quote. Your updates reflect live on the shop dashboard.</p>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-white/10 rounded-2xl border border-white/20 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Progress</p>
                            <p className="text-4xl font-black italic">{inquiry.items.filter(it => it.status !== 'Pending').length}/{inquiry.items.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {inquiry.items.map((item) => {
                        const isResponded = item.status !== 'Pending';
                        return (
                            <Card key={item.id} className="group relative rounded-[24px] border-none shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 bg-white">
                                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                                    <Image src={item.images?.[0] || 'https://picsum.photos/seed/placeholder/400/500'} fill alt={item.category} className="object-cover transition-transform group-hover:scale-105" />
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        <Badge className="bg-white/90 text-slate-900 border-none shadow-sm uppercase font-black italic text-[9px] w-fit">{item.category}</Badge>
                                        <Badge className="bg-primary/90 text-white border-none shadow-sm font-black text-[9px] w-fit">QTY: {item.quantityRequested}</Badge>
                                    </div>
                                    
                                    {item.isConfirmedByAdmin && (
                                        <div className="absolute top-0 right-0 z-10 bg-green-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl shadow-lg">
                                            <Check className="h-3 w-3 inline mr-1" /> Confirmed
                                        </div>
                                    )}

                                    {isResponded && !item.isConfirmedByAdmin && (
                                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="text-sm font-black italic uppercase text-slate-800 truncate">{item.category}</h3>
                                    <div className="flex gap-2 text-[9px] text-muted-foreground font-mono">
                                        {item.length && <span>L:{item.length}</span>}
                                        {item.breadth && <span>B:{item.breadth}</span>}
                                        {item.height && <span>H:{item.height}</span>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 min-h-[2.4em]">"{item.descriptionRequested || "Pricing required."}"</p>
                                    
                                    <div className="pt-2">
                                        <Badge variant={isResponded ? "default" : "secondary"} className={cn("w-full justify-center text-[9px] font-black py-1", item.status === 'Available' && "bg-green-500", item.status === 'Alternate Proposed' && "bg-amber-500")}>
                                            {item.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-0">
                                    <Dialog open={!!activeItem && activeItem.id === item.id} onOpenChange={(open) => !open && setActiveItem(null)}>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" className="w-full h-12 rounded-none border-t text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors" onClick={() => handleOpenUpdate(item)}>
                                                {isResponded ? 'Update Quote' : 'Add Price Quote'}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] p-0 border-none bg-white">
                                            <div className="grid grid-cols-1 md:grid-cols-2">
                                                <div className="bg-slate-100 p-6 md:p-10 space-y-6">
                                                    <Carousel className="w-full rounded-[24px] overflow-hidden shadow-xl bg-white">
                                                        <CarouselContent>
                                                            {(item.images || []).map((uri, idx) => (
                                                                <CarouselItem key={idx}>
                                                                    <div className="relative aspect-square w-full"><Image src={uri} fill alt="p" className="object-cover" /></div>
                                                                </CarouselItem>
                                                            ))}
                                                        </CarouselContent>
                                                        {(item.images || []).length > 1 && <><CarouselPrevious className="left-4" /><CarouselNext className="right-4" /></>}
                                                    </Carousel>
                                                    <div className="space-y-2">
                                                        <Badge className="bg-primary text-white italic">{item.category}</Badge>
                                                        <h4 className="text-3xl font-black italic text-slate-900">QTY: {item.quantityRequested}</h4>
                                                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200">
                                                            <div className="text-center"><p className="text-[8px] text-slate-400 font-bold uppercase">Length</p><p className="font-mono text-sm">{item.length || '-'}</p></div>
                                                            <div className="text-center border-x"><p className="text-[8px] text-slate-400 font-bold uppercase">Breadth</p><p className="font-mono text-sm">{item.breadth || '-'}</p></div>
                                                            <div className="text-center"><p className="text-[8px] text-slate-400 font-bold uppercase">Height</p><p className="font-mono text-sm">{item.height || '-'}</p></div>
                                                        </div>
                                                        <p className="text-sm italic text-slate-600 bg-white/50 p-4 rounded-xl border border-white/50">"{item.descriptionRequested}"</p>
                                                    </div>
                                                </div>
                                                <div className="p-6 md:p-10 space-y-8">
                                                    <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase">Quote for Article</DialogTitle></DialogHeader>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button variant={response.availability === 'Available' ? 'default' : 'outline'} className="h-16 rounded-2xl flex flex-col font-black text-[10px] uppercase" onClick={() => setResponse({ ...response, availability: 'Available' })}><CheckCircle2 className="h-5 w-5 mb-1" /> Available</Button>
                                                        <Button variant={response.availability === 'Out of Stock' ? 'destructive' : 'outline'} className="h-16 rounded-2xl flex flex-col font-black text-[10px] uppercase" onClick={() => setResponse({ ...response, availability: 'Out of Stock' })}><XCircle className="h-5 w-5 mb-1" /> Sold Out</Button>
                                                    </div>
                                                    {response.availability === 'Available' ? (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Wholesale (₹)</Label><Input type="number" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={response.wholesalePrice} onChange={e => setResponse({...response, wholesalePrice: e.target.value})} /></div>
                                                                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Est. MRP (₹)</Label><Input type="number" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={response.estimatedMRP} onChange={e => setResponse({...response, estimatedMRP: e.target.value})} /></div>
                                                            </div>
                                                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Article Note</Label><Textarea className="rounded-xl bg-slate-50 border-none min-h-[100px]" placeholder="Dimensions, material quality..." value={response.description} onChange={e => setResponse({...response, description: e.target.value})} /></div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                                                            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200 space-y-4">
                                                                <h4 className="font-black text-amber-900 uppercase flex items-center gap-2 text-xs"><RefreshCw className="h-3 w-3"/> Propose Alternate</h4>
                                                                <div className="relative h-40 w-full border-2 border-dashed rounded-2xl flex items-center justify-center bg-white cursor-pointer" onClick={() => document.getElementById('alt-img-edit')?.click()}>
                                                                    {alternate.imageDataUri ? <Image src={alternate.imageDataUri} fill className="object-contain p-2" alt="alt" /> : <div className="flex flex-col items-center gap-1"><ImagePlus className="h-6 w-6 text-amber-300" /><span className="text-[9px] font-bold text-amber-600">UPLOAD PHOTO</span></div>}
                                                                </div>
                                                                <input id="alt-img-edit" type="file" className="hidden" onChange={handleAltImage} />
                                                                <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Title</Label><Input className="h-9 rounded-xl border-amber-100 bg-white" value={alternate.title} onChange={e => setAlternate({...alternate, title: e.target.value})} /></div>
                                                                <div className="grid grid-cols-3 gap-1">
                                                                    <div className="space-y-1"><Label className="text-[8px] uppercase text-amber-800">L</Label><Input className="h-7 text-[10px] border-amber-100 bg-white" value={alternate.length} onChange={e => setAlternate({...alternate, length: e.target.value})} /></div>
                                                                    <div className="space-y-1"><Label className="text-[8px] uppercase text-amber-800">B</Label><Input className="h-7 text-[10px] border-amber-100 bg-white" value={alternate.breadth} onChange={e => setAlternate({...alternate, breadth: e.target.value})} /></div>
                                                                    <div className="space-y-1"><Label className="text-[8px] uppercase text-amber-800">H</Label><Input className="h-7 text-[10px] border-amber-100 bg-white" value={alternate.height} onChange={e => setAlternate({...alternate, height: e.target.value})} /></div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Price (₹)</Label><Input type="number" className="h-9 rounded-xl border-amber-100 bg-white" value={alternate.wholesalePrice || ''} onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} /></div>
                                                                    <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Qty Avail</Label><Input type="number" className="h-9 rounded-xl border-amber-100 bg-white" value={alternate.availableQuantity || ''} onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} /></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <DialogFooter className="pt-4 border-t"><Button variant="outline" onClick={() => setActiveItem(null)} className="rounded-xl font-bold uppercase text-[10px]">Cancel</Button><Button className="flex-1 rounded-xl h-12 font-black uppercase text-xs" onClick={handleSaveItemResponse} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-3 w-3" />} Save Quote</Button></DialogFooter>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
                <div className="flex flex-col items-center justify-center pt-10 text-center space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">Powered by SnazzPay Wholesale</p>
                </div>
            </main>
        </div>
    );
}

export default function WholesaleResponsePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-white"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>}>
            <WholesaleResponseContent />
        </Suspense>
    );
}
