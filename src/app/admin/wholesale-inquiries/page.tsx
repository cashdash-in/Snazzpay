'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument, batchUpdateDocuments } from "@/services/firestore";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, ImagePlus, FileSpreadsheet, Send, Search, CheckCircle2, Eye, Copy, Clock, Tag, Package, Trash2, BookOpen } from "lucide-react";
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import * as XLSX from 'xlsx';
import type { WholesaleInquiry } from '@/types/wholesale';
import type { Vendor } from '@/app/vendors/page';
import { cn } from '@/lib/utils';
import { db } from "@/lib/firebase";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";

const MAX_IMAGE_SIZE_PX = 800;

export default function WholesaleInquiriesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inquiries, setInquiries] = useState<WholesaleInquiry[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [newInquiry, setNewInquiry] = useState({
        vendorId: '',
        category: '',
        quantity: '',
        description: '',
        images: [] as string[],
    });
    
    // Quick Add Vendor State
    const [newVendor, setNewVendor] = useState({ name: '', phone: '', email: '' });

    // Live sync for inquiries
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'wholesale_inquiries'), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WholesaleInquiry));
            setInquiries(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Wholesale Real-time Sync Error:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load vendors
    useEffect(() => {
        async function loadVendors() {
            try {
                const allVendors = await getCollection<Vendor>('vendors');
                setVendors(allVendors.filter(v => v.status === 'approved'));
            } catch (e) {
                toast({ variant: 'destructive', title: "Error loading vendors" });
            }
        }
        loadVendors();
    }, [toast]);

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > height) {
                        if (width > MAX_IMAGE_SIZE_PX) {
                            height *= MAX_IMAGE_SIZE_PX / width;
                            width = MAX_IMAGE_SIZE_PX;
                        }
                    } else {
                        if (height > MAX_IMAGE_SIZE_PX) {
                            width *= MAX_IMAGE_SIZE_PX / height;
                            height = MAX_IMAGE_SIZE_PX;
                        }
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

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newUris: string[] = [];
            for (const file of Array.from(files)) {
                const resized = await resizeImage(file);
                newUris.push(resized);
            }
            setNewInquiry(prev => ({ ...prev, images: [...prev.images, ...newUris] }));
        }
    };

    const handleSendInquiry = async () => {
        if (!newInquiry.vendorId || newInquiry.images.length === 0 || !newInquiry.quantity || !newInquiry.category) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please provide a vendor, category, at least one image, and quantity." });
            return;
        }
        setIsSubmitting(true);
        const selectedVendor = vendors.find(v => v.id === newInquiry.vendorId);
        
        const inquiryId = uuidv4();
        const inquiryData: WholesaleInquiry = {
            id: inquiryId,
            adminId: user?.uid || 'admin',
            vendorId: newInquiry.vendorId,
            vendorName: selectedVendor?.name || 'Guest Vendor',
            category: newInquiry.category,
            productImages: newInquiry.images,
            quantityRequested: parseInt(newInquiry.quantity) || 1,
            descriptionRequested: newInquiry.description,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isReadByAdmin: true,
        };

        try {
            await saveDocument('wholesale_inquiries', inquiryData, inquiryId);
            setNewInquiry({ vendorId: '', category: '', quantity: '', description: '', images: [] });
            toast({ title: "Magazine Request Created!", description: `Share the link with ${inquiryData.vendorName} via WhatsApp.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to create inquiry" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyRequestLink = (inquiryId: string) => {
        const url = `${window.location.origin}/wholesale-request/${inquiryId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Magazine Link Copied!", description: "Send this professional magazine link to your vendor." });
    };

    const handleAddVendor = async () => {
        if (!newVendor.name || !newVendor.phone) {
            toast({ variant: 'destructive', title: "Details Required" });
            return;
        }
        const id = uuidv4();
        const vendorData: Omit<Vendor, 'id'> = {
            name: newVendor.name,
            contactPerson: newVendor.name,
            phone: newVendor.phone,
            email: newVendor.email,
            status: 'approved',
        };
        try {
            await saveDocument('vendors', vendorData, id);
            setVendors(prev => [...prev, { ...vendorData, id }]);
            setNewVendor({ name: '', phone: '', email: '' });
            toast({ title: "Vendor Added" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error adding vendor" });
        }
    };

    const handleExportExcel = () => {
        if (inquiries.length === 0) return;
        
        const data = inquiries.map(i => ({
            'Date': i.createdAt ? format(new Date(i.createdAt), 'PP') : 'N/A',
            'Last Updated': i.updatedAt ? format(new Date(i.updatedAt), 'PPp') : 'N/A',
            'Category': i.category || 'N/A',
            'Vendor': i.vendorName || 'N/A',
            'Status': i.status || 'Pending',
            'Qty Requested': i.quantityRequested || 0,
            'Wholesale Price (₹)': i.wholesalePrice || 'N/A',
            'Est. MRP (₹)': i.estimatedMRP || 'N/A',
            'Vendor Note': i.vendorDescription || 'N/A',
            'Alternate Title': i.alternateProduct?.title || 'N/A',
            'Alternate Price (₹)': i.alternateProduct?.wholesalePrice || 'N/A',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Wholesale Reports');
        XLSX.writeFile(wb, `Wholesale_Magazine_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Excel Exported!" });
    };

    const filteredInquiries = inquiries.filter(i => {
        const query = searchQuery.toLowerCase();
        return (
            (i.vendorName || '').toLowerCase().includes(query) ||
            (i.status || '').toLowerCase().includes(query) ||
            (i.category || '').toLowerCase().includes(query)
        );
    });

    const safeFormatDistance = (dateString?: string) => {
        if (!dateString) return 'Never';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Never';
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (e) {
            return 'Never';
        }
    };

    return (
        <AppShell title="Wholesale Coordination Hub">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Section */}
                <Card className="lg:col-span-1 shadow-xl border-primary/20 sticky top-24 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="text-primary h-5 w-5" />
                            Create Request Magazine
                        </CardTitle>
                        <CardDescription>Build a professional multi-image request for any vendor.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>Product Pictures (Add multiple)</Label>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                {newInquiry.images.map((src, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-md overflow-hidden border">
                                        <Image src={src} alt="preview" fill className="object-cover" />
                                        <Button 
                                            size="icon" 
                                            variant="destructive" 
                                            className="absolute top-0 right-0 h-4 w-4 rounded-none opacity-80 hover:opacity-100"
                                            onClick={() => setNewInquiry(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ))}
                                {newInquiry.images.length < 8 && (
                                    <div 
                                        className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer bg-muted hover:bg-muted/50"
                                        onClick={() => document.getElementById('inquiry-images')?.click()}
                                    >
                                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            <input id="inquiry-images" type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Article Category</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="category" 
                                    placeholder="e.g., Religious Articles, Apparel" 
                                    value={newInquiry.category} 
                                    onChange={e => setNewInquiry({...newInquiry, category: e.target.value})}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vendor">Assign to Vendor</Label>
                                <Select value={newInquiry.vendorId} onValueChange={val => setNewInquiry({...newInquiry, vendorId: val})}>
                                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                        {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="qty">Quantity Needed</Label>
                                <Input id="qty" type="number" placeholder="e.g., 50" value={newInquiry.quantity} onChange={e => setNewInquiry({...newInquiry, quantity: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Private Notes for Admin</Label>
                            <Textarea id="desc" placeholder="Details about specific requirements..." value={newInquiry.description} onChange={e => setNewInquiry({...newInquiry, description: e.target.value})} />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full h-12" onClick={handleSendInquiry} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            Generate & Send Request
                        </Button>
                        <Dialog>
                            <DialogTrigger asChild><Button variant="link" size="sm" className="w-full">Wait, I have a new vendor!</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Quick Onboard Vendor</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2"><Label>Vendor Name</Label><Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Phone</Label><Input value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} /></div>
                                    <div className="space-y-2"><Label>Email</Label><Input value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} /></div>
                                </div>
                                <DialogFooter><DialogClose asChild><Button onClick={handleAddVendor}>Save Vendor</Button></DialogClose></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                </Card>

                {/* Feed Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                         <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search magazines by vendor, category..." 
                                className="pl-9" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={handleExportExcel} disabled={inquiries.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export List
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            <div className="col-span-full h-48 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : filteredInquiries.length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-muted/10 rounded-xl border-2 border-dashed">
                                <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                                <p className="text-muted-foreground">No active request magazines found.</p>
                            </div>
                        ) : (
                            filteredInquiries.map(item => (
                                <Card key={item.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-300 border-t-4 border-t-primary">
                                    <div className="relative h-56 w-full bg-slate-900 overflow-hidden">
                                        <Image 
                                            src={(item.productImages && item.productImages.length > 0) ? item.productImages[0] : 'https://picsum.photos/seed/placeholder/400/400'} 
                                            alt="Magazine Cover" 
                                            fill 
                                            className="object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <Badge className="absolute top-4 right-4 shadow-lg h-7" variant={item.status === 'Pending' ? 'secondary' : 'default'}>
                                            {item.status || 'Pending'}
                                        </Badge>
                                        {(item.productImages && item.productImages.length > 1) && (
                                            <Badge variant="outline" className="absolute top-4 left-4 bg-black/50 text-white border-none">
                                                +{item.productImages.length - 1} More Images
                                            </Badge>
                                        )}
                                        <div className="absolute bottom-4 left-4 text-white">
                                            <h4 className="font-black italic text-xl tracking-tighter uppercase">{item.category || 'General'}</h4>
                                            <p className="text-[10px] text-slate-300">REQUESTED FROM {(item.vendorName || 'VEND').toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold">Qty: {item.quantityRequested || 0} Units</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1 italic">"{item.descriptionRequested || ''}"</p>
                                            </div>
                                            <div className="text-right">
                                                {item.wholesalePrice ? (
                                                    <div className="animate-in fade-in zoom-in duration-500">
                                                        <p className="text-[10px] uppercase font-bold text-green-600">Live Quote</p>
                                                        <p className="font-black text-lg text-primary">₹{item.wholesalePrice}</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-orange-500">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Awaiting Quote</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground bg-muted/40 p-2 rounded-lg border">
                                            <Clock className="h-3 w-3" />
                                            <span>Quote Last Updated: {safeFormatDistance(item.updatedAt)}</span>
                                        </div>

                                        {item.alternateProduct && (
                                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3">
                                                <div className="relative h-10 w-10 shrink-0 rounded border bg-white overflow-hidden">
                                                    <Image src={item.alternateProduct.imageDataUri || 'https://picsum.photos/seed/alt/200/200'} alt="alt" fill className="object-contain" />
                                                </div>
                                                <div className="flex-grow overflow-hidden">
                                                    <p className="text-[10px] font-bold text-blue-800 uppercase">Alternate Proposed</p>
                                                    <p className="text-xs font-semibold truncate">{item.alternateProduct.title}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-xs font-bold text-blue-900">₹{item.alternateProduct.wholesalePrice}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0 gap-3">
                                        <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleCopyRequestLink(item.id)}>
                                            <Copy className="h-3 w-3 mr-2" /> Share Link
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="flex-1 rounded-xl"><Eye className="h-3 w-3 mr-2" /> View Full View</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-black italic tracking-tighter">WHOLESALE MAGAZINE REPORT</DialogTitle>
                                                    <DialogDescription>Vendor: {item.vendorName} &bull; Created: {item.createdAt ? format(new Date(item.createdAt), 'PPP p') : 'N/A'}</DialogDescription>
                                                </DialogHeader>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                                                    <div className="space-y-6">
                                                        <Label className="text-xs font-black uppercase tracking-widest text-primary/60">The Inquiry</Label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(item.productImages || []).map((uri, idx) => (
                                                                <div key={idx} className="aspect-square relative rounded-xl border bg-white overflow-hidden shadow-sm">
                                                                    <Image src={uri} alt="Req" fill className="object-contain" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-4 bg-muted/40 rounded-xl border italic text-sm">
                                                            "{item.descriptionRequested || ''}"
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <Label className="text-xs font-black uppercase tracking-widest text-primary/60">Vendor Live Quote</Label>
                                                        {(item.status === 'Pending' || !item.status) ? (
                                                            <div className="flex flex-col items-center justify-center p-12 bg-muted/20 border-2 border-dashed rounded-2xl">
                                                                <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
                                                                <p className="text-sm font-medium text-muted-foreground">Waiting for vendor response...</p>
                                                                <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-tighter">Share the link via WhatsApp to get a price</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
                                                                        <p className="text-[10px] uppercase font-bold text-green-700 mb-1">Wholesale Price</p>
                                                                        <p className="text-2xl font-black text-slate-900">₹{item.wholesalePrice || item.alternateProduct?.wholesalePrice || 0}</p>
                                                                    </div>
                                                                    <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                                                        <p className="text-[10px] uppercase font-bold text-blue-700 mb-1">Estimated MRP</p>
                                                                        <p className="text-2xl font-black text-slate-900">₹{item.estimatedMRP || item.alternateProduct?.estimatedMRP || 0}</p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {item.alternateProduct && (
                                                                    <Card className="border-blue-200 bg-blue-50/30 overflow-hidden">
                                                                        <div className="relative h-48 w-full bg-white border-b">
                                                                            <Image src={item.alternateProduct.imageDataUri || 'https://picsum.photos/seed/alt/400/400'} alt="Alt" fill className="object-contain p-4" />
                                                                        </div>
                                                                        <CardContent className="p-4 space-y-2">
                                                                            <Badge className="bg-blue-600 mb-1">ALTERNATE PRODUCT</Badge>
                                                                            <h4 className="font-bold text-lg">{item.alternateProduct.title}</h4>
                                                                            <p className="text-xs text-muted-foreground">{item.alternateProduct.description}</p>
                                                                            <div className="flex justify-between items-center pt-2 border-t border-blue-100">
                                                                                <span className="text-xs font-bold">Qty Available: {item.alternateProduct.availableQuantity}</span>
                                                                                <span className="text-[10px] text-muted-foreground uppercase">{item.alternateProduct.category}</span>
                                                                            </div>
                                                                        </CardContent>
                                                                    </Card>
                                                                )}

                                                                {item.vendorDescription && (
                                                                    <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg">
                                                                        <p className="text-[10px] uppercase font-bold text-primary mb-2">Vendor Response Note</p>
                                                                        <p className="text-xs leading-relaxed opacity-90">{item.vendorDescription}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </CardFooter>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
