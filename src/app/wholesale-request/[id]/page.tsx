
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getDocument, saveDocument } from "@/services/firestore";
import { Loader2, CheckCircle2, XCircle, Send, ImagePlus, RefreshCw, Package, ArrowLeft, ShieldCheck, Factory } from "lucide-react";
import Image from 'next/image';
import type { WholesaleInquiry, AlternateProduct } from '@/types/wholesale';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
                    // Pre-fill if they've already responded
                    if (data.status !== 'Pending') {
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
            toast({ title: "Response Saved!", description: "The shop owner has been notified of your quote." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to save" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-slate-50"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full shadow-2xl text-center">
                    <CardHeader>
                        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-2" />
                        <CardTitle className="text-2xl">Response Submitted!</CardTitle>
                        <CardDescription>Thank you for your response. The shop owner will review your wholesale quote shortly.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" variant="outline" onClick={() => window.close()}>Close Window</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!inquiry) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full shadow-lg text-center p-8">
                    <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold">Request Not Found</h2>
                    <p className="text-muted-foreground mt-2">This wholesale request may have been removed or the link is invalid.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <header className="bg-white border-b sticky top-0 z-10 p-4">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-bold text-slate-800">Snazzify Partner Quote</h1>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Wholesale Request</Badge>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Product View (Magazine Style) */}
                <div className="space-y-6">
                    <Card className="shadow-xl overflow-hidden rounded-2xl border-none">
                        <div className="relative aspect-square bg-white">
                            <Image src={inquiry.productImage} alt="Request" fill className="object-contain p-6" />
                        </div>
                        <CardHeader className="bg-slate-900 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="secondary" className="mb-2 bg-primary text-white border-none">{inquiry.category}</Badge>
                                    <CardTitle className="text-2xl font-black italic tracking-tighter">STOCK INQUIRY</CardTitle>
                                    <p className="text-slate-300 text-sm mt-1">Quantity Requested: <span className="text-white font-bold">{inquiry.quantityRequested} Units</span></p>
                                </div>
                                <Package className="h-8 w-8 text-primary opacity-50" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 bg-slate-50 italic text-slate-600 border-b">
                            {inquiry.descriptionRequested ? `"${inquiry.descriptionRequested}"` : "Please provide wholesale pricing for the pictured item."}
                        </CardContent>
                    </Card>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground p-4 bg-slate-100 rounded-lg">
                        <Factory className="h-4 w-4" />
                        <p>Request issued by <span className="font-bold">Snazzify Admin</span> on {format(new Date(inquiry.createdAt), 'PPP')}</p>
                    </div>
                </div>

                {/* Right Side: Professional Response Form */}
                <div className="space-y-6">
                    <Card className="shadow-xl border-t-8 border-t-primary rounded-2xl">
                        <CardHeader>
                            <CardTitle>Submit Your Quote</CardTitle>
                            <CardDescription>Select availability and provide pricing or alternate options.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-base font-bold">Stock Availability</Label>
                                <div className="flex gap-4">
                                    <Button 
                                        variant={response.availability === 'Available' ? 'default' : 'outline'} 
                                        className={cn("flex-1 h-16 rounded-xl border-2", response.availability === 'Available' && "border-primary")}
                                        onClick={() => setResponse({ ...response, availability: 'Available' })}
                                    >
                                        <CheckCircle2 className="mr-2 h-5 w-5" /> Available
                                    </Button>
                                    <Button 
                                        variant={response.availability === 'Out of Stock' ? 'destructive' : 'outline'} 
                                        className={cn("flex-1 h-16 rounded-xl border-2", response.availability === 'Out of Stock' && "border-destructive")}
                                        onClick={() => setResponse({ ...response, availability: 'Out of Stock' })}
                                    >
                                        <XCircle className="mr-2 h-5 w-5" /> Out of Stock
                                    </Button>
                                </div>
                            </div>

                            {response.availability === 'Available' ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Wholesale Price (₹)</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="0.00"
                                                className="h-12 text-lg font-bold"
                                                value={response.wholesalePrice} 
                                                onChange={e => setResponse({...response, wholesalePrice: e.target.value})} 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Estimated MRP (₹)</Label>
                                            <Input 
                                                type="number" 
                                                placeholder="0.00"
                                                className="h-12 text-lg"
                                                value={response.estimatedMRP} 
                                                onChange={e => setResponse({...response, estimatedMRP: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Item Specification / Details</Label>
                                        <Textarea 
                                            placeholder="Mention material, dimensions, pack size..." 
                                            rows={4}
                                            value={response.description} 
                                            onChange={e => setResponse({...response, description: e.target.value})} 
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                    <div className="border-2 border-dashed border-blue-200 p-6 rounded-2xl bg-blue-50/20 space-y-4">
                                        <div className="flex items-center gap-2 text-blue-800 font-black italic uppercase">
                                            <RefreshCw className="h-5 w-5" />
                                            Propose Alternate
                                        </div>
                                        <p className="text-xs text-blue-600 bg-blue-100 p-2 rounded">Original item is OOS. Please upload and detail a similar product you currently have in stock.</p>
                                        
                                        <div className="space-y-2">
                                            <Label>Product Title</Label>
                                            <Input value={alternate.title} onChange={e => setAlternate({...alternate, title: e.target.value})} placeholder="e.g., Premium Ceramic Cross" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Alternate Picture</Label>
                                            <div 
                                                className="relative w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 flex flex-col items-center justify-center"
                                                onClick={() => document.getElementById('alt-img')?.click()}
                                            >
                                                {alternate.imageDataUri ? (
                                                    <Image src={alternate.imageDataUri} alt="alt" fill className="object-contain p-2" />
                                                ) : (
                                                    <>
                                                        <ImagePlus className="h-8 w-8 text-muted-foreground mb-1" />
                                                        <span className="text-[10px] text-muted-foreground">Click to upload photo</span>
                                                    </>
                                                )}
                                            </div>
                                            <input id="alt-img" type="file" accept="image/*" onChange={handleAltImage} className="hidden" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2"><Label>Wholesale Price</Label><Input type="number" value={alternate.wholesalePrice || ''} onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} /></div>
                                            <div className="space-y-2"><Label>Available Qty</Label><Input type="number" value={alternate.availableQuantity || ''} onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} /></div>
                                        </div>
                                        
                                        <div className="space-y-2"><Label>Description of Alternate</Label><Textarea value={alternate.description} onChange={e => setAlternate({...alternate, description: e.target.value})} rows={3} placeholder="Tell us why this is a good alternative..." /></div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full h-14 text-lg rounded-xl shadow-lg" onClick={handleSaveResponse} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-5 w-5" />}
                                Save & Send Response
                            </Button>
                        </CardFooter>
                    </Card>
                    <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">Secure Wholesale Platform & bull; SnazzPay</p>
                </div>
            </main>
        </div>
    );
}

export default function WholesaleResponsePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
            <WholesaleResponseContent />
        </Suspense>
    );
}
