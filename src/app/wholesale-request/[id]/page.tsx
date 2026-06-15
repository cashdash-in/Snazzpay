'use server';

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
import { Loader2, CheckCircle2, XCircle, Send, ImagePlus, RefreshCw, ShieldCheck, Factory, BookOpen, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import Image from 'next/image';
import type { WholesaleInquiry, WholesaleItem, AlternateProduct } from '@/types/wholesale';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const MAX_IMAGE_SIZE_PX = 800;

function WholesaleResponseContent() {
    const params = useParams();
    const { toast } = useToast();
    const [inquiry, setInquiry] = useState<WholesaleInquiry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isMagazineSubmitted, setIsMagazineSubmitted] = useState(false);

    // Form State for Active Item
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
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load details.' });
            } finally {
                setIsLoading(false);
            }
        }
        loadInquiry();
    }, [params.id, toast]);

    const handleSaveItemResponse = async () => {
        if (!inquiry) return;
        const item = inquiry.items?.[activeItemIndex];
        if (!item) return;

        const isOOS = response.availability === 'Out of Stock';

        // Numeric parsing and validation
        const wPrice = parseFloat(response.wholesalePrice);
        const mPrice = parseFloat(response.estimatedMRP);

        if (!isOOS) {
            if (!response.wholesalePrice || !response.estimatedMRP) {
                toast({ variant: 'destructive', title: "Pricing Required", description: "Please enter both wholesale and MRP prices." });
                return;
            }
            if (isNaN(wPrice) || isNaN(mPrice)) {
                toast({ variant: 'destructive', title: "Invalid Pricing", description: "Please enter valid numeric values for prices." });
                return;
            }
        }

        if (isOOS && !alternate.imageDataUri) {
            toast({ variant: 'destructive', title: "Alternate Required", description: "Please upload an image for the alternate product." });
            return;
        }

        setIsSaving(true);
        try {
            const updatedItems = [...(inquiry.items || [])];
            const updatedItem: WholesaleItem = {
                ...item,
                status: isOOS ? 'Alternate Proposed' : 'Available',
                wholesalePrice: isOOS ? undefined : wPrice,
                estimatedMRP: isOOS ? undefined : mPrice,
                vendorDescription: response.description,
                alternateProduct: isOOS ? { ...alternate, category: item.category } : undefined,
            };
            updatedItems[activeItemIndex] = updatedItem;

            const respondedCount = updatedItems.filter(it => it.status !== 'Pending').length;
            const newStatus = respondedCount === updatedItems.length ? 'Responded' : 'Partially Responded';

            const updatePayload = { 
                items: updatedItems, 
                status: newStatus,
                updatedAt: new Date().toISOString(),
                isReadByAdmin: false 
            };

            await saveDocument('wholesale_inquiries', updatePayload, inquiry.id);

            setInquiry({ ...inquiry, items: updatedItems, status: newStatus });
            
            toast({ title: "Product Quote Saved!" });
            
            if (activeItemIndex < (inquiry.items || []).length - 1) {
                setActiveItemIndex(activeItemIndex + 1);
                resetForm();
            } else {
                setIsMagazineSubmitted(true);
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your response. Please check your network connection." });
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setResponse({ availability: 'Available', wholesalePrice: '', estimatedMRP: '', description: '' });
        setAlternate({ title: '', imageDataUri: '', wholesalePrice: 0, estimatedMRP: 0, availableQuantity: 0, description: '' });
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
    
    if (isMagazineSubmitted) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 text-center">
            <Card className="max-w-md shadow-2xl p-10 rounded-[40px] border-none">
                <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-6" />
                <h1 className="text-3xl font-black italic uppercase">Quotes Sent!</h1>
                <p className="text-muted-foreground mt-4">Thank you for your wholesale response. The shop admin has been notified.</p>
                <Button className="mt-8 w-full h-14 rounded-2xl" variant="outline" onClick={() => window.close()}>Close Magazine</Button>
            </Card>
        </div>
    );

    if (!inquiry || !inquiry.items || inquiry.items.length === 0) return <div className="p-20 text-center">Magazine not found or is empty.</div>;

    const activeItem = inquiry.items[activeItemIndex];

    return (
        <div className="min-h-screen bg-[#fcfcfc] font-serif">
            <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-black tracking-tighter italic uppercase">{inquiry.title}</h1>
                        <p className="text-[8px] font-bold text-primary uppercase">Wholesale Magazine</p>
                    </div>
                </div>
                <Badge variant="outline" className="h-7 px-4 rounded-full font-bold text-[10px]">
                    PRODUCT {activeItemIndex + 1} OF {inquiry.items.length}
                </Badge>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-8">
                    <Carousel className="w-full rounded-[32px] overflow-hidden shadow-2xl border-white border-[12px] bg-white">
                        <CarouselContent>
                            {((activeItem.images || []).length > 0 ? activeItem.images : ['https://picsum.photos/seed/w/800/1000']).map((uri, idx) => (
                                <CarouselItem key={idx}>
                                    <div className="relative aspect-[4/5] w-full"><Image src={uri} fill alt="p" className="object-cover" /></div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {(activeItem.images || []).length > 1 && <><CarouselPrevious className="left-4" /><CarouselNext className="right-4" /></>}
                    </Carousel>
                    
                    <div className="space-y-4 px-4">
                        <Badge className="bg-primary text-white uppercase italic">{activeItem.category}</Badge>
                        <h2 className="text-5xl font-black italic tracking-tighter text-slate-900 leading-none">QTY: {activeItem.quantityRequested}</h2>
                        <div className="p-6 bg-slate-100 rounded-3xl italic">"{activeItem.descriptionRequested || "Pricing required for this inventory item."}"</div>
                    </div>
                </div>

                <Card className="shadow-2xl rounded-[40px] border-none overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-8">
                        <CardTitle className="text-2xl font-black italic uppercase">Price Quote</CardTitle>
                        <CardDescription className="text-slate-400">Respond to this item to proceed to next.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setResponse({...response, availability: 'Available'})} className={cn("h-20 rounded-2xl border-4 flex flex-col items-center justify-center transition-all", response.availability === 'Available' ? "border-primary bg-primary/5 text-primary shadow-lg" : "border-slate-50 text-slate-400")}>
                                <CheckCircle2 className="h-6 w-6 mb-1" /><span className="text-xs font-black uppercase">Available</span>
                            </button>
                            <button onClick={() => setResponse({...response, availability: 'Out of Stock'})} className={cn("h-20 rounded-2xl border-4 flex flex-col items-center justify-center transition-all", response.availability === 'Out of Stock' ? "border-destructive bg-destructive/5 text-destructive shadow-lg" : "border-slate-50 text-slate-400")}>
                                <XCircle className="h-6 w-6 mb-1" /><span className="text-xs font-black uppercase">Sold Out</span>
                            </button>
                        </div>

                        {response.availability === 'Available' ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Wholesale (₹)</Label>
                                        <Input type="number" step="0.01" className="h-14 text-2xl font-black bg-slate-50 border-none rounded-xl px-4" value={response.wholesalePrice} onChange={e => setResponse({...response, wholesalePrice: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase">Est. MRP (₹)</Label>
                                        <Input type="number" step="0.01" className="h-14 text-2xl font-black bg-slate-50 border-none rounded-xl px-4" value={response.estimatedMRP} onChange={e => setResponse({...response, estimatedMRP: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Specifications</Label>
                                    <Textarea className="rounded-xl bg-slate-50 border-none" placeholder="Dimensions, Pack size, Material..." value={response.description} onChange={e => setResponse({...response, description: e.target.value})} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-left">
                                <div className="bg-amber-50 p-6 rounded-3xl border-2 border-dashed border-amber-200 space-y-4">
                                    <h4 className="font-black text-amber-900 uppercase flex items-center gap-2"><RefreshCw className="h-4 w-4"/> Propose Alternate</h4>
                                    <div className="relative h-48 w-full border-2 border-dashed rounded-2xl flex items-center justify-center bg-white" onClick={() => document.getElementById('alt-img')?.click()}>
                                        {alternate.imageDataUri ? <Image src={alternate.imageDataUri} fill className="object-contain p-2" alt="alt" /> : <ImagePlus className="h-8 w-8 text-amber-300" />}
                                    </div>
                                    <input id="alt-img" type="file" className="hidden" onChange={handleAltImage} />
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase">Title</Label>
                                        <Input className="h-10 rounded-xl" value={alternate.title} onChange={e => setAlternate({...alternate, title: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1"><Label className="text-[10px] uppercase">Wholesale (₹)</Label><Input type="number" className="h-10 rounded-xl" value={alternate.wholesalePrice || ''} onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} /></div>
                                        <div className="space-y-1"><Label className="text-[10px] uppercase">Available Qty</Label><Input type="number" className="h-10 rounded-xl" value={alternate.availableQuantity || ''} onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} /></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-8 bg-slate-50 border-t flex flex-col gap-4">
                        <Button className="w-full h-16 text-xl font-black uppercase rounded-2xl shadow-xl" onClick={handleSaveItemResponse} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                            {activeItemIndex < inquiry.items.length - 1 ? 'Save & Next Product' : 'Send All Quotes'}
                        </Button>
                        <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">Powered by SnazzPay Wholesale Magazine</p>
                    </CardFooter>
                </Card>
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