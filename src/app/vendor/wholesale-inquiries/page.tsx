
'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument } from "@/services/firestore";
import { Loader2, Package, CheckCircle2, XCircle, RefreshCw, Send, ImagePlus, AlertCircle, Tag } from "lucide-react";
import Image from 'next/image';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WholesaleInquiry, WholesaleStatus, AlternateProduct } from '@/types/wholesale';

const MAX_IMAGE_SIZE_PX = 800;

export default function VendorWholesalePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inquiries, setInquiries] = useState<WholesaleInquiry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeInquiry, setActiveInquiry] = useState<WholesaleInquiry | null>(null);
    const [isSaving, setIsSaving] = useState(false);

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

    const loadInquiries = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allInquiries = await getCollection<WholesaleInquiry>('wholesale_inquiries');
            const myInquiries = allInquiries.filter(i => i.vendorId === user.uid);
            setInquiries(myInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to load requests" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadInquiries();
    }, [loadInquiries]);

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
        if (!activeInquiry) return;
        
        const isOOS = response.availability === 'Out of Stock';
        const hasAlternate = alternate.imageDataUri !== '';

        if (!isOOS && (!response.wholesalePrice || !response.estimatedMRP)) {
            toast({ variant: 'destructive', title: "Pricing Required", description: "Please provide wholesale and MRP prices." });
            return;
        }

        if (isOOS && !hasAlternate) {
            toast({ variant: 'destructive', title: "Alternate Required", description: "Please provide an alternate product if original is OOS." });
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
                isReadByAdmin: false, // Trigger notification for admin
            };

            if (isOOS && hasAlternate) {
                updatedInquiry.alternateProduct = {
                    ...alternate,
                    category: alternate.category || activeInquiry.category
                };
            }

            await saveDocument('wholesale_inquiries', updatedInquiry, activeInquiry.id);
            setInquiries(prev => prev.map(i => i.id === activeInquiry.id ? { ...i, ...updatedInquiry } : i));
            toast({ title: "Response Saved", description: "The admin has been notified." });
            setActiveInquiry(null);
            
            // Reset alternate form
            setAlternate({ title: '', imageDataUri: '', wholesalePrice: 0, estimatedMRP: 0, availableQuantity: 0, description: '', category: '' });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to save" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;

    return (
        <AppShell title="Wholesale Price Requests">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Incoming Stock Inquiries</CardTitle>
                        <CardDescription>Price requests from the shop owner. You can suggest alternates for any category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Article</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inquiries.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inquiries found.</TableCell></TableRow>
                                ) : (
                                    inquiries.map(item => (
                                        <TableRow key={item.id} className={cn(activeInquiry?.id === item.id && "bg-primary/5")}>
                                            <TableCell className="text-xs">{format(new Date(item.createdAt), 'PP')}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Image src={item.productImage} alt="stock" width={32} height={32} className="rounded object-cover" />
                                                    <span className="text-xs truncate max-w-[80px]">{item.descriptionRequested}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="secondary" className="text-[10px]">{item.category}</Badge></TableCell>
                                            <TableCell className="text-xs">{item.quantityRequested}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant={item.status === 'Pending' ? 'default' : 'outline'} onClick={() => setActiveInquiry(item)}>
                                                    {item.status === 'Pending' ? 'Respond' : 'View / Edit'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {activeInquiry ? (
                    <Card className="shadow-lg border-primary/30">
                        <CardHeader className="bg-primary/5">
                            <CardTitle className="text-lg">Respond to Inquiry</CardTitle>
                            <CardDescription>Category: {activeInquiry.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex gap-4 items-start p-4 bg-muted/30 rounded-lg border">
                                <Image src={activeInquiry.productImage} alt="Requested" width={100} height={100} className="rounded-lg object-contain bg-white border" />
                                <div className="space-y-1">
                                    <Badge variant="outline" className="mb-1">{activeInquiry.category}</Badge>
                                    <p className="text-sm font-bold">Qty Requested: {activeInquiry.quantityRequested}</p>
                                    <p className="text-xs text-muted-foreground">Note: {activeInquiry.descriptionRequested}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Stock Availability</Label>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant={response.availability === 'Available' ? 'default' : 'outline'} 
                                                className="flex-1"
                                                onClick={() => setResponse({ ...response, availability: 'Available' })}
                                            >
                                                <CheckCircle2 className="mr-2 h-4 w-4" /> Available
                                            </Button>
                                            <Button 
                                                variant={response.availability === 'Out of Stock' ? 'destructive' : 'outline'} 
                                                className="flex-1"
                                                onClick={() => setResponse({ ...response, availability: 'Out of Stock' })}
                                            >
                                                <XCircle className="mr-2 h-4 w-4" /> Out of Stock
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {response.availability === 'Available' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-green-50/30">
                                        <div className="space-y-2">
                                            <Label>Wholesale Price (₹)</Label>
                                            <Input type="number" value={response.wholesalePrice} onChange={e => setResponse({...response, wholesalePrice: e.target.value})} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Estimated MRP (₹)</Label>
                                            <Input type="number" value={response.estimatedMRP} onChange={e => setResponse({...response, estimatedMRP: e.target.value})} />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label>Item Specification / Details</Label>
                                            <Textarea value={response.description} onChange={e => setResponse({...response, description: e.target.value})} placeholder="e.g., Material, Dimensions, Pack size..." />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
                                            <AlertCircle className="h-5 w-5" />
                                            <p>Original item is out of stock. Please suggest a similar <strong>Alternate Product</strong> below.</p>
                                        </div>
                                        
                                        <div className="border-2 border-dashed border-blue-200 p-6 rounded-xl space-y-4 bg-blue-50/10">
                                            <h4 className="font-bold text-blue-800 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Proposed Alternate Detail</h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                 <div className="space-y-2">
                                                    <Label>Alternate Picture</Label>
                                                    <div 
                                                        className="relative w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-muted/20 flex items-center justify-center"
                                                        onClick={() => document.getElementById('alt-img')?.click()}
                                                    >
                                                        {alternate.imageDataUri ? (
                                                            <Image src={alternate.imageDataUri} alt="alt" fill className="object-contain p-2" />
                                                        ) : (
                                                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <input id="alt-img" type="file" accept="image/*" onChange={handleAltImage} className="hidden" />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="space-y-2"><Label>Product Title</Label><Input value={alternate.title} onChange={e => setAlternate({...alternate, title: e.target.value})} /></div>
                                                    <div className="space-y-2"><Label>Category</Label><Input value={alternate.category} placeholder={activeInquiry.category} onChange={e => setAlternate({...alternate, category: e.target.value})} /></div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2"><Label>Wholesale Price (₹)</Label><Input type="number" value={alternate.wholesalePrice} onChange={e => setAlternate({...alternate, wholesalePrice: parseFloat(e.target.value) || 0})} /></div>
                                                <div className="space-y-2"><Label>Estimated MRP (₹)</Label><Input type="number" value={alternate.estimatedMRP} onChange={e => setAlternate({...alternate, estimatedMRP: parseFloat(e.target.value) || 0})} /></div>
                                            </div>
                                            
                                            <div className="space-y-2"><Label>Available Qty</Label><Input type="number" value={alternate.availableQuantity} onChange={e => setAlternate({...alternate, availableQuantity: parseInt(e.target.value) || 0})} /></div>

                                            <div className="space-y-2"><Label>Description of Alternate</Label><Textarea value={alternate.description} onChange={e => setAlternate({...alternate, description: e.target.value})} rows={3} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" onClick={() => setActiveInquiry(null)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleSaveResponse} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
                                Send Quote to Admin
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 h-full bg-muted/10 border border-dashed rounded-xl">
                        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground">Select an inquiry from the list to respond</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">You can provide wholesale pricing or propose alternates for any product type.</p>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
