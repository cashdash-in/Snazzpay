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
import { Loader2, CheckCircle2, XCircle, Send, ImagePlus, RefreshCw, Package, ArrowLeft, ShieldCheck, Factory, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import Image from 'next/image';
import type { WholesaleInquiry, AlternateProduct } from '@/types/wholesale';
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
    const router = useRouter();
    const { toast } = useToast();
    const [inquiry, setInquiry] = useState<WholesaleInquiry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Response State
    const [response, setResponse] = useState({
        availability: 'Available' as 'Available' | 'Out of Stock',
        wholesalePrice: '',
        estimatedMRP: '',
        description: '',
    });

    // Alternate State
    const [alternate, setAlternate] = useState<AlternateProduct>({
        title: '',
        imageDataUri: '',
        wholesalePrice: 0,
        estimatedMRP: 0,
        availableQuantity: 0,
        description: '',
        category: '',
    });

    useEffect(() => {
        async function loadInquiry() {
            const id = params.id as string;
            if (!id) return;
            
            try {
                const data = await getDocument<WholesaleInquiry>('wholesale_inquiries', id);
                if (data) {
                    setInquiry(data);
                    if (data.status && data.status !== 'Pending') {
                        setResponse({
                            availability: data.status === 'Available' ? 'Available' : 'Out of Stock',
                            wholesalePrice: data.wholesalePrice?.toString() || '',
                            estimatedMRP: data.estimatedMRP?.toString() || '',
                            description: data.vendorDescription || '',
                        });
                        if (data.alternateProduct) {
                            setAlternate(data.alternateProduct);
                        }
                    }
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load the request details.' });
            } finally {
                setIsLoading(false);
            }
        }
        loadInquiry();
    }, [params.id, toast]);

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > MAX_IMAGE_SIZE_PX || height > MAX_IMAGE_SIZE_PX) {
                        const ratio = Math.min(MAX_IMAGE_SIZE_PX / width, MAX_IMAGE_SIZE_PX / height);
                        width *= ratio;
                        height *= ratio;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleAltImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const resized = await resizeImage(file);
            setAlternate(prev => ({ ...prev, imageDataUri: resized }));
        }
    };

    const handleSaveResponse = async () => {
        if (!inquiry) return;
        
        const isOOS = response.availability === 'Out of Stock';
        const hasAlternate = alternate.imageDataUri !== '';

        if (!isOOS && (!response.wholesalePrice || !response.estimatedMRP)) {
            toast({ variant: 'destructive', title: "Pricing Required", description: "Please provide wholesale and MRP prices." });
            return;
        }

        if (isOOS && !hasAlternate) {
            toast({ variant: 'destructive', title: "Alternate Required", description: "Please provide an alternate product since the original is out of stock." });
            return;
        }

        setIsSaving(true);
        try {
            const updatedInquiry: Partial<WholesaleInquiry> = {
                status: isOOS ? 'Alternate Proposed' : 'Available',
                wholesalePrice: isOOS ? undefined : parseFloat(response.wholesalePrice),
                estimatedMRP: isOOS ? undefined : parseFloat(response.estimatedMRP),
                vendorDescription: response.description,
                updatedAt: new Date().toISOString(),
                isReadByAdmin: false,
            };

            if (isOOS && hasAlternate) {
                updatedInquiry.alternateProduct = {
                    ...alternate,
                    category: alternate.category || inquiry.category
                };
            }

            await saveDocument('wholesale_inquiries', updatedInquiry, inquiry.id);
            setIsSubmitted(true);
            toast({ title: "Quote Saved!", description: "The details have been sent to the shop owner." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to save response" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full shadow-2xl text-center p-8 rounded-3xl border-none">
                    <CardHeader>
                        <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-4 animate-bounce" />
                        <CardTitle className="text-3xl font-black italic tracking-tighter">SUBMITTED!</CardTitle>
                        <CardDescription className="text-lg">Thank you for your wholesale quote. The shop admin has been notified and will review it immediately.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full h-14 text-lg rounded-2xl" variant="outline" onClick={() => window.close()}>Close Window</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!inquiry) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full shadow-lg text-center p-8 rounded-3xl">
                    <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-2xl font-bold">Magazine Not Found</h2>
                    <p className="text-muted-foreground mt-2">This request may have expired or was removed by the admin.</p>
                </Card>
            </div>
        );
    }

    const carouselImages = inquiry.productImages && inquiry.productImages.length > 0 
        ? inquiry.productImages 
        : ['https://picsum.photos/seed/wholesale/800/1000'];

    return (
        <div className="min-h-screen bg-[#fcfcfc] pb-20 font-serif">
            <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="bg-primary p-1.5 rounded-lg shadow-inner">
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter italic text-slate-900 leading-none">SNAZZIFY</h1>
                        <p className="text-[8px] font-bold tracking-widest text-primary uppercase">Wholesale Magazine</p>
                    </div>
                </div>
                <Badge variant="outline" className="h-7 px-4 rounded-full border-primary/20 bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-widest">
                    Request No: {inquiry.id.substring(0, 8)}
                </Badge>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-8 lg:sticky lg:top-28">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-primary/5 rounded-[40px] blur-3xl -z-10 group-hover:bg-primary/10 transition-all" />
                        <Carousel className="w-full rounded-[32px] overflow-hidden shadow-2xl border-white border-[12px] bg-white">
                            <CarouselContent>
                                {carouselImages.map((uri, idx) => (
                                    <CarouselItem key={idx}>
                                        <div className="relative aspect-[4/5] w-full">
                                            <Image 
                                                src={uri} 
                                                alt={`Product View ${idx + 1}`} 
                                                fill 
                                                className="object-cover" 
                                                priority={idx === 0}
                                            />
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            {carouselImages.length > 1 && (
                                <>
                                    <CarouselPrevious className="left-4 bg-white/80 hover:bg-white border-none shadow-lg" />
                                    <CarouselNext className="right-4 bg-white/80 hover:bg-white border-none shadow-lg" />
                                </>
                            )}
                        </Carousel>
                        
                        <div className="absolute top-8 left-8 z-10">
                            <Badge className="bg-primary text-white px-4 py-1.5 rounded-full text-xs font-black italic shadow-xl border-none">
                                {(inquiry.category || 'GENERAL').toUpperCase()}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-4 px-4">
                        <h2 className="text-5xl font-black italic tracking-tighter text-slate-900 leading-[0.9] uppercase">
                            Stock<br/>Inquiry
                        </h2>
                        <div className="h-1 w-20 bg-primary rounded-full" />
                        <div className="grid grid-cols-2 gap-8 py-4 border-y border-slate-200">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Desired Quantity</p>
                                <p className="text-3xl font-black text-slate-900">{inquiry.quantityRequested || 0} <span className="text-sm font-medium italic">Units</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Issued Date</p>
                                <p className="text-sm font-bold text-slate-700">{inquiry.createdAt ? format(new Date(inquiry.createdAt), 'PPP') : 'N/A'}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-100 rounded-3xl relative">
                            <span className="absolute -top-3 left-6 text-4xl font-serif text-primary opacity-30">“</span>
                            <p className="text-slate-600 italic leading-relaxed">
                                {inquiry.descriptionRequested || "Please provide your best wholesale pricing and availability for this item."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <Card className="shadow-2xl rounded-[40px] border-none overflow-hidden bg-white">
                        <CardHeader className="bg-slate-900 text-white p-10">
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">Supplier Response</CardTitle>
                            <CardDescription className="text-slate-400 text-base">Provide your live wholesale quote below.</CardDescription>
                        </CardHeader>
                        
                        <CardContent className="p-10 space-y-10">
                            <div className="space-y-4">
                                <Label className="text-sm font-black uppercase tracking-widest text-slate-500">Is this article available?</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setResponse({ ...response, availability: 'Available' })}
                                        className={cn(
                                            "h-20 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-all",
                                            response.availability === 'Available' 
                                                ? "border-primary bg-primary/5 text-primary scale-[1.02] shadow-lg" 
                                                : "border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <CheckCircle2 className={cn("h-6 w-6", response.availability === 'Available' ? "text-primary" : "text-slate-200")} />
                                        <span className="text-xs font-black uppercase">Yes, In Stock</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setResponse({ ...response, availability: 'Out of Stock' })}
                                        className={cn(
                                            "h-20 rounded-2xl border-4 flex flex-col items-center justify-center gap-1 transition-all",
                                            response.availability === 'Out of Stock' 
                                                ? "border-destructive bg-destructive/5 text-destructive scale-[1.02] shadow-lg" 
                                                : "border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <XCircle className={cn("h-6 w-6", response.availability === 'Out of Stock' ? "text-destructive" : "text-slate-200")} />
                                        <span className="text-xs font-black uppercase">No, Sold Out</span>
                                    </button>
                                </div>
                            </div>

                            {response.availability === 'Available' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Wholesale Price (₹)</Label>
                                            <Input 
                                                type="number" 
                                                className="h-16 text-3xl font-black rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-primary/20 transition-all px-6"
                                                placeholder="0"
                                                value={response.wholesalePrice} 
                                                onChange={e => setResponse({...response, wholesalePrice: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-500">Estimated MRP (₹)</Label>
                                            <Input 
                                                type="number" 
                                                className="h-16 text-2xl font-black rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-primary/20 transition-all px-6"
                                                placeholder="0"
                                                value={response.estimatedMRP} 
                                                onChange={e => setResponse({...response, estimatedMRP: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-500">Specification Details</Label>
                                        <Textarea 
                                            placeholder="Mention material, size, pack info..." 
                                            className="rounded-2xl bg-slate-50 border-none min-h-[120px] p-6 focus:ring-4 focus:ring-primary/20"
                                            value={response.description} 
                                            onChange={e => setResponse({...response, description: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-left duration-500">
                                    <div className="bg-amber-50 rounded-3xl p-8 border-2 border-dashed border-amber-200 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-amber-500 p-2 rounded-full"><RefreshCw className="h-6 w-6 text-white" /></div>
                                            <h3 className="text-xl font-black italic tracking-tighter text-amber-900 uppercase">Propose Alternate</h3>
                                        </div>
                                        <p className="text-sm text-amber-700 leading-relaxed">
                                            Original item is unavailable. <strong>Adding a similar product</strong> keeps the customer engaged! Upload a photo and set your price below.
                                        </p>
                                        
                                        <div className="space-y-4">
                                            <div 
                                                className="relative h-60 w-full rounded-2xl border-4 border-dashed border-amber-200 bg-white hover:bg-amber-100/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden"
                                                onClick={() => document.getElementById('alt-img-upload')?.click()}
                                            >
                                                {alternate.imageDataUri ? (
                                                    <Image src={alternate.imageDataUri} alt="Alt Preview" fill className="object-contain p-4" />
                                                ) : (
                                                    <div className="text-center space-y-2">
                                                        <ImagePlus className="h-12 w-12 text-amber-400 mx-auto" />
                                                        <span className="text-xs font-black uppercase text-amber-600">Upload Product Photo</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input id="alt-img-upload" type="file" accept="image/*" onChange={handleAltImage} className="hidden" />

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-amber-700">Alternate Product Title</Label>
                                                <Input 
                                                    className="h-12 rounded-xl border-amber-200 focus:ring-amber-500"
                                                    placeholder="Enter title..."
                                                    value={alternate.title} 
                                                    onChange={e => setAlternate({...alternate, title: e.target.value})} 
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-amber-700">Wholesale (₹)</Label>
                                                    <Input 
                                                        type="number" 
                                                        className="h-12 rounded-xl border-amber-200 focus:ring-amber-500"
                                                        value={alternate.wholesalePrice || ''} 
                                                        onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-amber-700">Qty Available</Label>
                                                    <Input 
                                                        type="number" 
                                                        className="h-12 rounded-xl border-amber-200 focus:ring-amber-500"
                                                        value={alternate.availableQuantity || ''} 
                                                        onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-amber-700">Brief Description</Label>
                                                <Textarea 
                                                    className="rounded-xl border-amber-200 focus:ring-amber-500 min-h-[100px]"
                                                    placeholder="Why is this a good alternative?"
                                                    value={alternate.description} 
                                                    onChange={e => setAlternate({...alternate, description: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        
                        <CardFooter className="p-10 bg-slate-50 border-t flex flex-col gap-4">
                            <Button 
                                className="w-full h-20 text-2xl font-black italic tracking-tighter uppercase rounded-3xl shadow-2xl hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                onClick={handleSaveResponse} 
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="animate-spin mr-3 h-8 w-8" /> : <Send className="mr-3 h-7 w-7" />}
                                Send Live Quote
                            </Button>
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-[0.2em]">Secure Wholesale B2B Platform • SnazzPay</p>
                        </CardFooter>
                    </Card>
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
