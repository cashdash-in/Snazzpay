'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument } from "@/services/firestore";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, ImagePlus, FileSpreadsheet, Send, Search, CheckCircle2, Eye, Copy, Clock, Tag, Package, Trash2, BookOpen, Layers, RefreshCw, Ruler, Check } from "lucide-react";
import Image from 'next/image';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import * as XLSX from 'xlsx';
import type { WholesaleInquiry, WholesaleItem } from '@/types/wholesale';
import type { Vendor } from '@/app/vendors/page';
import { db } from "@/lib/firebase";
import { onSnapshot, collection, query, orderBy, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";

const MAX_IMAGE_SIZE_PX = 800;

function SafeRelativeTime({ date }: { date: string | undefined }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || !date) return null;
    const d = new Date(date);
    if (!isValid(d)) return null;

    try {
        return <>{formatDistanceToNow(d)} ago</>;
    } catch (e) {
        return null;
    }
}

export default function WholesaleInquiriesPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [inquiries, setInquiries] = useState<WholesaleInquiry[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Multi-Item Form State
    const [magazineTitle, setMagazineTitle] = useState('New Inventory Request');
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [items, setItems] = useState<Omit<WholesaleItem, 'id' | 'status'>[]>([
        { images: [], category: '', quantityRequested: 1, descriptionRequested: '', length: '', breadth: '', height: '' }
    ]);
    
    // Live sync
    useEffect(() => {
        if (!db) return;
        try {
            const q = query(collection(db, 'wholesale_inquiries'), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WholesaleInquiry));
                setInquiries(data);
                setIsLoading(false);
            }, (error) => {
                console.error("Firestore error:", error);
                setIsLoading(false);
            });
            return () => unsubscribe();
        } catch (e) {
            console.error("Failed to setup snapshot:", e);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const unread = inquiries.filter(i => i.isReadByAdmin === false);
        if (unread.length > 0 && db) {
            unread.forEach(async (inq) => {
                try {
                    await updateDoc(doc(db, 'wholesale_inquiries', inq.id), { isReadByAdmin: true });
                } catch (e) {
                    console.error("Failed to mark unread:", e);
                }
            });
        }
    }, [inquiries]);

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
                        if (width > MAX_IMAGE_SIZE_PX) { height *= MAX_IMAGE_SIZE_PX / width; width = MAX_IMAGE_SIZE_PX; }
                    } else {
                        if (height > MAX_IMAGE_SIZE_PX) { width *= MAX_IMAGE_SIZE_PX / height; height = MAX_IMAGE_SIZE_PX; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleItemImageChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newUris: string[] = [];
            for (const file of Array.from(files)) {
                const resized = await resizeImage(file);
                newUris.push(resized);
            }
            setItems(prev => prev.map((item, i) => i === index ? { ...item, images: [...item.images, ...newUris] } : item));
        }
    };

    const addItem = () => setItems([...items, { images: [], category: '', quantityRequested: 1, descriptionRequested: '', length: '', breadth: '', height: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleSendInquiry = async () => {
        if (!selectedVendorId || items.some(item => (item.images || []).length === 0 || !item.category)) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please select a vendor and ensure all products have a category and at least one image." });
            return;
        }
        setIsSubmitting(true);
        const selectedVendor = vendors.find(v => v.id === selectedVendorId);
        
        const inquiryId = uuidv4();
        const inquiryData: WholesaleInquiry = {
            id: inquiryId,
            adminId: user?.uid || 'admin',
            vendorId: selectedVendorId,
            vendorName: selectedVendor?.name || 'Guest Vendor',
            title: magazineTitle,
            items: items.map(item => ({ ...item, id: uuidv4(), status: 'Pending' })),
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isReadByAdmin: true,
        };

        try {
            await saveDocument('wholesale_inquiries', inquiryData, inquiryId);
            setItems([{ images: [], category: '', quantityRequested: 1, descriptionRequested: '', length: '', breadth: '', height: '' }]);
            setMagazineTitle('New Inventory Request');
            setSelectedVendorId('');
            toast({ title: "Wholesale Magazine Created!", description: "Share the link with your vendor via WhatsApp." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to create inquiry" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmItem = async (inq: WholesaleInquiry, itemId: string) => {
        const updatedItems = inq.items.map(it => it.id === itemId ? { ...it, isConfirmedByAdmin: true } : it);
        try {
            await saveDocument('wholesale_inquiries', { items: updatedItems }, inq.id);
            toast({ title: "Article Confirmed", description: "The vendor will see this as confirmed in their magazine." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Confirmation Failed" });
        }
    };

    const handleCopyRequestLink = (inquiryId: string) => {
        const url = `${window.location.origin}/wholesale-request/${inquiryId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "Send this magazine link to your vendor." });
    };

    const handleDeleteInquiry = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'wholesale_inquiries', id));
            toast({ title: "Magazine Deleted" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Delete Failed" });
        }
    };

    const handleExportExcel = () => {
        if (inquiries.length === 0) return;
        const data = inquiries.flatMap(inq => (inq.items || []).map(item => ({
            'Magazine': inq.title,
            'Vendor': inq.vendorName,
            'Category': item.category,
            'Status': item.status,
            'Confirmed': item.isConfirmedByAdmin ? 'YES' : 'NO',
            'Qty Requested': item.quantityRequested,
            'Length': item.length || 'N/A',
            'Breadth': item.breadth || 'N/A',
            'Height': item.height || 'N/A',
            'Wholesale Price (₹)': item.status === 'Available' ? item.wholesalePrice : (item.status === 'Alternate Proposed' ? item.alternateProduct?.wholesalePrice : 'N/A'),
            'Est. MRP (₹)': item.status === 'Available' ? item.estimatedMRP : (item.status === 'Alternate Proposed' ? item.alternateProduct?.estimatedMRP : 'N/A'),
            'Alternate Title': item.status === 'Alternate Proposed' ? item.alternateProduct?.title : 'N/A',
            'Alt Qty Available': item.status === 'Alternate Proposed' ? item.alternateProduct?.availableQuantity : 'N/A',
            'Vendor Note': item.vendorDescription || 'N/A',
            'Date': inq.createdAt ? format(new Date(inq.createdAt), 'PP') : 'N/A',
        })));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Wholesale Report');
        XLSX.writeFile(wb, `Wholesale_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const filteredInquiries = inquiries.filter(i => {
        const queryStr = searchQuery.toLowerCase();
        return (i.vendorName || '').toLowerCase().includes(queryStr) || (i.title || '').toLowerCase().includes(queryStr);
    });

    return (
        <AppShell title="Wholesale Coordination Hub">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Creation Section */}
                <Card className="lg:col-span-1 shadow-xl border-primary/20 sticky top-24 h-fit max-h-[80vh] overflow-y-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="text-primary h-5 w-5" />
                            Create Wholesale Magazine
                        </CardTitle>
                        <CardDescription>Send a professional multi-product request to any vendor.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Magazine/Collection Title</Label>
                            <Input value={magazineTitle} onChange={e => setMagazineTitle(e.target.value)} placeholder="e.g., Diwali Stock Request" />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign to Vendor</Label>
                            <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                                <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-6 border-t pt-4">
                            {items.map((item, idx) => (
                                <div key={idx} className="p-4 bg-muted/40 rounded-xl space-y-4 border relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase">Product Images</Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(item.images || []).map((src, i) => (
                                                <div key={i} className="relative aspect-square rounded border overflow-hidden">
                                                    <Image src={src} fill alt="preview" className="object-cover" />
                                                </div>
                                            ))}
                                            {(item.images || []).length < 5 && (
                                                <button className="aspect-square flex items-center justify-center border-2 border-dashed rounded bg-white" onClick={() => document.getElementById(`img-in-${idx}`)?.click()}>
                                                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                            )}
                                        </div>
                                        <input id={`img-in-${idx}`} type="file" multiple className="hidden" onChange={e => handleItemImageChange(idx, e)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase">Category</Label>
                                            <Input className="h-8 text-xs" value={item.category} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, category: e.target.value } : it))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase">Qty Needed</Label>
                                            <Input type="number" className="h-8 text-xs" value={item.quantityRequested} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, quantityRequested: parseInt(e.target.value) || 1 } : it))} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="space-y-1">
                                            <Label className="text-[8px] uppercase">Length</Label>
                                            <Input className="h-7 text-[10px]" placeholder="e.g., 5ft" value={item.length} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, length: e.target.value } : it))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[8px] uppercase">Breadth</Label>
                                            <Input className="h-7 text-[10px]" placeholder="e.g., 2ft" value={item.breadth} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, breadth: e.target.value } : it))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[8px] uppercase">Height</Label>
                                            <Input className="h-7 text-[10px]" placeholder="e.g., 3ft" value={item.height} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, height: e.target.value } : it))} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase">Note for Vendor</Label>
                                        <Input className="h-8 text-xs" value={item.descriptionRequested} onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, descriptionRequested: e.target.value } : it))} />
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full h-8 border-dashed" onClick={addItem}><PlusCircle className="h-3 w-3 mr-2" /> Add Another Product</Button>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-12" onClick={handleSendInquiry} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            Create & Share Magazine
                        </Button>
                    </CardFooter>
                </Card>

                {/* Feed Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search magazines..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                        <Button variant="outline" onClick={handleExportExcel}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export Report</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {isLoading ? (
                            <div className="col-span-full h-48 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : filteredInquiries.map(inq => (
                            <Card key={inq.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-300 border-t-4 border-t-primary relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
                                    onClick={() => handleDeleteInquiry(inq.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="relative h-48 w-full bg-slate-900">
                                    <Image src={(inq.items?.[0]?.images?.[0]) || 'https://picsum.photos/seed/mag/400/300'} fill alt="mag" className="object-cover opacity-60" />
                                    <div className="absolute bottom-4 left-4 text-white">
                                        <h4 className="font-black italic text-xl uppercase leading-none">{inq.title}</h4>
                                        <p className="text-[10px] font-bold text-primary-foreground uppercase mt-1">To: {inq.vendorName}</p>
                                    </div>
                                    <Badge className="absolute top-4 left-4">{inq.status}</Badge>
                                </div>
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex justify-between text-xs border-b pb-2">
                                        <span className="font-bold flex items-center gap-1"><Layers className="h-3 w-3" /> {(inq.items || []).length} Products</span>
                                        <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> <SafeRelativeTime date={inq.updatedAt || inq.createdAt} /></span>
                                    </div>
                                    <div className="space-y-2">
                                        {(inq.items || []).slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                     <span className="truncate max-w-[120px]">{item.category} ({item.quantityRequested})</span>
                                                     {item.isConfirmedByAdmin && <Badge className="h-4 px-1 bg-green-500 text-[8px] uppercase">Confirmed</Badge>}
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] h-4",
                                                    item.status === 'Available' && "bg-green-50 text-green-700",
                                                    item.status === 'Alternate Proposed' && "bg-blue-50 text-blue-700"
                                                )}>{item.status}</Badge>
                                            </div>
                                        ))}
                                        {(inq.items || []).length > 3 && <p className="text-[10px] text-center text-muted-foreground italic">+{(inq.items || []).length - 3} more articles</p>}
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleCopyRequestLink(inq.id)}><Copy className="h-3 w-3 mr-2" /> Share</Button>
                                    <Dialog>
                                        <DialogTrigger asChild><Button size="sm" className="flex-1 rounded-xl"><Eye className="h-3 w-3 mr-2" /> View Status</Button></DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="text-2xl font-black italic">WHOLESALE MAGAZINE: {inq.title}</DialogTitle>
                                            </DialogHeader>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                                {(inq.items || []).map((item, idx) => (
                                                    <Card key={idx} className="border-2 overflow-hidden relative">
                                                        {item.isConfirmedByAdmin && (
                                                            <div className="absolute top-0 right-0 z-10 bg-green-500 text-white text-[10px] font-black uppercase px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                                                                <Check className="h-3 w-3" /> Approved
                                                            </div>
                                                        )}
                                                        <CardHeader className="p-3 bg-muted/20">
                                                            <div className="flex justify-between items-center">
                                                                <CardTitle className="text-sm">{item.category}</CardTitle>
                                                                <Badge variant={item.status === 'Pending' ? 'secondary' : 'default'} className={cn(
                                                                    item.status === 'Available' && "bg-green-500",
                                                                    item.status === 'Alternate Proposed' && "bg-blue-500"
                                                                )}>{item.status}</Badge>
                                                            </div>
                                                        </CardHeader>
                                                        <CardContent className="p-3 space-y-3">
                                                            <div className="flex gap-3">
                                                                <div className="relative w-[80px] h-[80px] shrink-0 border rounded overflow-hidden">
                                                                    <Image src={item.images?.[0] || 'https://picsum.photos/seed/placeholder/100/100'} fill alt="p" className="object-cover" />
                                                                </div>
                                                                <div className="text-xs space-y-1">
                                                                    <p><strong>Qty Req:</strong> {item.quantityRequested}</p>
                                                                    <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
                                                                        {item.length && <span>L:{item.length}</span>}
                                                                        {item.breadth && <span>B:{item.breadth}</span>}
                                                                        {item.height && <span>H:{item.height}</span>}
                                                                    </div>
                                                                    <p className="italic text-muted-foreground">"{item.descriptionRequested}"</p>
                                                                </div>
                                                            </div>
                                                            
                                                            {item.status !== 'Pending' && (
                                                                <div className={cn(
                                                                    "p-3 rounded-lg border text-sm",
                                                                    item.status === 'Alternate Proposed' ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"
                                                                )}>
                                                                    {item.status === 'Alternate Proposed' ? (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-center gap-2 text-blue-700 font-bold uppercase text-[10px]">
                                                                                <RefreshCw className="h-3 w-3" />
                                                                                Alternate Proposed:
                                                                            </div>
                                                                            <div className="flex gap-3 items-start">
                                                                                {item.alternateProduct?.imageDataUri && (
                                                                                    <div className="relative w-[100px] h-[100px] shrink-0 border-2 border-white rounded-lg shadow-sm overflow-hidden bg-white">
                                                                                        <Image src={item.alternateProduct.imageDataUri} fill className="object-contain p-1" alt="alt" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="space-y-1 flex-1">
                                                                                    <p className="font-bold text-slate-900 leading-tight">{item.alternateProduct?.title}</p>
                                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                                                        <p><span className="text-muted-foreground">Wholesale:</span> <span className="font-bold text-blue-700">₹{item.alternateProduct?.wholesalePrice}</span></p>
                                                                                        <p><span className="text-muted-foreground">MRP:</span> <span className="font-bold">₹{item.alternateProduct?.estimatedMRP}</span></p>
                                                                                        <p className="col-span-2"><span className="text-muted-foreground">Avail. Qty:</span> <span className="font-bold">{item.alternateProduct?.availableQuantity}</span></p>
                                                                                    </div>
                                                                                     <div className="flex gap-2 text-[10px] text-blue-600 font-mono">
                                                                                        {item.alternateProduct?.length && <span>L:{item.alternateProduct.length}</span>}
                                                                                        {item.alternateProduct?.breadth && <span>B:{item.alternateProduct.breadth}</span>}
                                                                                        {item.alternateProduct?.height && <span>H:{item.alternateProduct.height}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {item.alternateProduct?.description && (
                                                                                <p className="text-[11px] text-slate-600 bg-white/50 p-2 rounded border border-white italic">"{item.alternateProduct.description}"</p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-2">
                                                                            <p className="font-bold text-green-700 uppercase text-[10px]">Live Quote:</p>
                                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                                <p><span className="text-muted-foreground">Wholesale:</span> <span className="font-bold">₹{item.wholesalePrice}</span></p>
                                                                                <p><span className="text-muted-foreground">Est MRP:</span> <span className="font-bold">₹{item.estimatedMRP}</span></p>
                                                                            </div>
                                                                            {item.vendorDescription && (
                                                                                <p className="text-[11px] text-slate-600 bg-white/50 p-2 rounded border border-white italic">Note: "{item.vendorDescription}"</p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                        <CardFooter className="p-2 pt-0">
                                                             <Button 
                                                                className="w-full h-8 text-[10px] uppercase font-black" 
                                                                variant={item.isConfirmedByAdmin ? "secondary" : "default"}
                                                                disabled={item.status === 'Pending' || item.isConfirmedByAdmin}
                                                                onClick={() => handleConfirmItem(inq, item.id)}
                                                            >
                                                                {item.isConfirmedByAdmin ? 'Approved article' : 'Approve Quote'}
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
