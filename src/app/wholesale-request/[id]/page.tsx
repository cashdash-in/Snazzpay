
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
import { Loader2, CheckCircle2, XCircle, Send, ImagePlus, RefreshCw, ShieldCheck, Factory, BookOpen, Layers, Info, Check } from "lucide-react";
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WholesaleInquiry, WholesaleItem, AlternateProduct } from '@/types/wholesale';
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
            setAlternate({ title: '', imageDataUri: '', wholesalePrice: 0, estimatedMRP: 0, availableQuantity: 0, description: '' });
        }
    };

    const handleSaveItemResponse = async () => {
        if (!inquiry || !activeItem) return;

        const isOOS = response.availability === 'Out of Stock';
        
        // Sanitize numeric inputs to prevent NaN errors in Firestore
        const wPrice = parseFloat(response.wholesalePrice) || 0;
        const mPrice = parseFloat(response.estimatedMRP) || 0;

        if (!isOOS) {
            if (!response.wholesalePrice || !response.estimatedMRP) {
                toast({ variant: 'destructive', title: "Pricing Required", description: "Please enter wholesale and MRP prices." });
                return;
            }
        }

        if (isOOS && !alternate.imageDataUri) {
            toast({ variant: 'destructive', title: "Alternate Required", description: "Please upload an image for the alternate product." });
            return;
        }

        setIsSaving(true);
        try {
            const itemIndex = inquiry.items.findIndex(it => it.id === activeItem.id);
            if (itemIndex === -1) throw new Error("Article not found in list.");

            const updatedItems = [...(inquiry.items || [])];
            
            // Build the item update object carefully to avoid 'undefined'
            const itemUpdate: any = {
                ...activeItem,
                status: isOOS ? 'Alternate Proposed' : 'Available',
                vendorDescription: response.description || '',
            };

            if (isOOS) {
                itemUpdate.alternateProduct = {
                    title: alternate.title || 'Alternate Product',
                    imageDataUri: alternate.imageDataUri,
                    wholesalePrice: Number(alternate.wholesalePrice) || 0,
                    estimatedMRP: Number(alternate.estimatedMRP) || 0,
                    availableQuantity: Number(alternate.availableQuantity) || 0,
                    description: alternate.description || '',
                    category: activeItem.category
                };
                // Use null instead of undefined to signal removal to Firestore
                itemUpdate.wholesalePrice = null;
                itemUpdate.estimatedMRP = null;
            } else {
                itemUpdate.wholesalePrice = wPrice;
                itemUpdate.estimatedMRP = mPrice;
                itemUpdate.alternateProduct = null;
            }

            updatedItems[itemIndex] = itemUpdate;

            const respondedCount = updatedItems.filter(it => it.status !== 'Pending').length;
            const newStatus = respondedCount === updatedItems.length ? 'Responded' : 'Partially Responded';

            const updatePayload = { 
                items: updatedItems, 
                status: newStatus,
                updatedAt: new Date().toISOString(),
                isReadByAdmin: false 
            };

            await saveDocument('wholesale_inquiries', updatePayload, inquiry.id);
            setInquiry({ ...inquiry, ...updatePayload });
            
            toast({ title: "Product Quote Saved!", description: "Status updated instantly for the shop owner." });
            setActiveItem(null);
        } catch (error: any) {
            console.error("Save Error:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: error.message || "Could not save your response." });
        } finally {
            setIsSaving(false);
        }
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
    
    if (!inquiry || !inquiry.items || inquiry.items.length === 0) return (
        <div className="p-20 text-center space-y-4">
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Magazine Not Found</h1>
            <p className="text-muted-foreground">The link might be invalid or the magazine has been deleted.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Professional Header */}
            <header className="bg-white border-b sticky top-0 z-50 px-4 py-4 md:px-8 shadow-sm">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-lg md:text-2xl font-black tracking-tighter italic uppercase text-slate-900">{inquiry.title}</h1>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Wholesale Magazine Dashboard</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="hidden sm:flex h-8 px-4 rounded-full font-bold text-[10px] bg-slate-50">
                        {inquiry.items.length} ARTICLES REQUESTED
                    </Badge>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
                {/* Introduction Card */}
                <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-2 text-center md:text-left">
                            <h2 className="text-3xl font-black italic uppercase tracking-tight">Stock Inquiry Feed</h2>
                            <p className="text-slate-400 text-sm max-w-md">Hello! Please review the articles below and provide your best wholesale quotes. You can propose alternates if items are sold out.</p>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-white/10 rounded-2xl border border-white/20 min-w-[150px]">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completion</p>
                            <p className="text-4xl font-black italic">{inquiry.items.filter(it => it.status !== 'Pending').length}/{inquiry.items.length}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Grid of Requested Products */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {inquiry.items.map((item) => {
                        const isResponded = item.status !== 'Pending';
                        return (
                            <Card key={item.id} className="group relative rounded-[24px] border-none shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 bg-white">
                                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden">
                                    <Image 
                                        src={item.images?.[0] || 'https://picsum.photos/seed/placeholder/400/500'} 
                                        fill 
                                        alt={item.category} 
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                                        <Badge className="bg-white/90 text-slate-900 border-none shadow-sm uppercase font-black italic text-[9px] w-fit">
                                            {item.category}
                                        </Badge>
                                        <Badge className="bg-primary/90 text-white border-none shadow-sm font-black text-[9px] w-fit">
                                            QTY: {item.quantityRequested}
                                        </Badge>
                                    </div>
                                    
                                    {isResponded && (
                                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="text-sm font-black italic uppercase text-slate-800 truncate">{item.category}</h3>
                                    <p className="text-[10px] text-muted-foreground line-clamp-2 min-h-[2.4em]">"{item.descriptionRequested || "Pricing required."}"</p>
                                    
                                    <div className="pt-2">
                                        <Badge 
                                            variant={isResponded ? "default" : "secondary"} 
                                            className={cn(
                                                "w-full justify-center text-[9px] font-black py-1",
                                                item.status === 'Available' && "bg-green-500 hover:bg-green-600",
                                                item.status === 'Alternate Proposed' && "bg-amber-500 hover:bg-amber-600"
                                            )}
                                        >
                                            {item.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-0">
                                    <Dialog open={!!activeItem && activeItem.id === item.id} onOpenChange={(open) => !open && setActiveItem(null)}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                className="w-full h-12 rounded-none border-t text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors"
                                                onClick={() => handleOpenUpdate(item)}
                                            >
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
                                                        <p className="text-sm italic text-slate-600 bg-white/50 p-4 rounded-xl border border-white/50">"{item.descriptionRequested}"</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="p-6 md:p-10 space-y-8">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-2xl font-black italic uppercase">Quote for Article</DialogTitle>
                                                        <DialogDescription>Submit your wholesale offer below.</DialogDescription>
                                                    </DialogHeader>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button 
                                                            variant={response.availability === 'Available' ? 'default' : 'outline'} 
                                                            className={cn("h-16 rounded-2xl flex flex-col font-black text-[10px] uppercase transition-all", response.availability === 'Available' && "shadow-lg scale-[1.02]")}
                                                            onClick={() => setResponse({ ...response, availability: 'Available' })}
                                                        >
                                                            <CheckCircle2 className="h-5 w-5 mb-1" /> Available
                                                        </Button>
                                                        <Button 
                                                            variant={response.availability === 'Out of Stock' ? 'destructive' : 'outline'} 
                                                            className={cn("h-16 rounded-2xl flex flex-col font-black text-[10px] uppercase transition-all", response.availability === 'Out of Stock' && "shadow-lg scale-[1.02]")}
                                                            onClick={() => setResponse({ ...response, availability: 'Out of Stock' })}
                                                        >
                                                            <XCircle className="h-5 w-5 mb-1" /> Sold Out
                                                        </Button>
                                                    </div>

                                                    {response.availability === 'Available' ? (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Wholesale (₹)</Label>
                                                                    <Input type="number" step="0.01" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={response.wholesalePrice} onChange={e => setResponse({...response, wholesalePrice: e.target.value})} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Est. MRP (₹)</Label>
                                                                    <Input type="number" step="0.01" className="h-12 bg-slate-50 border-none rounded-xl font-bold" value={response.estimatedMRP} onChange={e => setResponse({...response, estimatedMRP: e.target.value})} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400">Additional Specs</Label>
                                                                <Textarea className="rounded-xl bg-slate-50 border-none min-h-[100px]" placeholder="Material, sizing, packaging..." value={response.description} onChange={e => setResponse({...response, description: e.target.value})} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                                                            <div className="bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200 space-y-4">
                                                                <h4 className="font-black text-amber-900 uppercase flex items-center gap-2 text-xs"><RefreshCw className="h-3 w-3"/> Propose Alternate</h4>
                                                                <div className="relative h-40 w-full border-2 border-dashed rounded-2xl flex items-center justify-center bg-white cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => document.getElementById('alt-img-edit')?.click()}>
                                                                    {alternate.imageDataUri ? <Image src={alternate.imageDataUri} fill className="object-contain p-2" alt="alt" /> : <div className="flex flex-col items-center gap-1"><ImagePlus className="h-6 w-6 text-amber-300" /><span className="text-[9px] font-bold text-amber-600">UPLOAD PHOTO</span></div>}
                                                                </div>
                                                                <input id="alt-img-edit" type="file" className="hidden" onChange={handleAltImage} />
                                                                <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Alternate Title</Label><Input className="h-9 rounded-xl border-amber-100" value={alternate.title} onChange={e => setAlternate({...alternate, title: e.target.value})} /></div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Wholesale (₹)</Label><Input type="number" className="h-9 rounded-xl border-amber-100" value={alternate.wholesalePrice || ''} onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} /></div>
                                                                    <div className="space-y-1"><Label className="text-[10px] uppercase text-amber-800">Available Qty</Label><Input type="number" className="h-9 rounded-xl border-amber-100" value={alternate.availableQuantity || ''} onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} /></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <DialogFooter className="pt-4 border-t">
                                                        <Button variant="outline" onClick={() => setActiveItem(null)} className="rounded-xl font-bold uppercase text-[10px]">Cancel</Button>
                                                        <Button className="flex-1 rounded-xl h-12 font-black uppercase text-xs" onClick={handleSaveItemResponse} disabled={isSaving}>
                                                            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-3 w-3" />}
                                                            Save Quote
                                                        </Button>
                                                    </DialogFooter>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
                
                {/* Completion CTA */}
                <div className="flex flex-col items-center justify-center pt-10 text-center space-y-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Once you've quoted all items, the shop owner will be alerted.</p>
                    <Button 
                        size="lg" 
                        variant="outline" 
                        className="rounded-full px-10 h-14 font-black uppercase italic border-2"
                        onClick={() => window.close()}
                    >
                        Finish & Close Magazine
                    </Button>
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
