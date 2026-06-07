
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCollection, saveDocument, batchUpdateDocuments } from "@/services/firestore";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, ImagePlus, FileSpreadsheet, Send, Search, CheckCircle2, AlertTriangle, Eye, Copy, Clock, Tag } from "lucide-react";
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import * as XLSX from 'xlsx';
import type { WholesaleInquiry } from '@/types/wholesale';
import type { Vendor } from '@/app/vendors/page';
import { cn } from '@/lib/utils';

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
        image: '',
    });
    
    // Quick Add Vendor State
    const [newVendor, setNewVendor] = useState({ name: '', phone: '', email: '' });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allInquiries, allVendors] = await Promise.all([
                getCollection<WholesaleInquiry>('wholesale_inquiries'),
                getCollection<Vendor>('vendors')
            ]);
            
            setInquiries(allInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setVendors(allVendors.filter(v => v.status === 'approved'));

            // Mark as read
            const unreadIds = allInquiries.filter(i => i.isReadByAdmin === false).map(i => i.id);
            if (unreadIds.length > 0) {
                await batchUpdateDocuments('wholesale_inquiries', unreadIds, { isReadByAdmin: true });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
        const file = e.target.files?.[0];
        if (file) {
            const resized = await resizeImage(file);
            setNewInquiry(prev => ({ ...prev, image: resized }));
        }
    };

    const handleSendInquiry = async () => {
        if (!newInquiry.vendorId || !newInquiry.image || !newInquiry.quantity || !newInquiry.category) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please provide a vendor, category, image, and quantity." });
            return;
        }
        setIsSubmitting(true);
        const selectedVendor = vendors.find(v => v.id === newInquiry.vendorId);
        
        const inquiryData: WholesaleInquiry = {
            id: uuidv4(),
            adminId: user?.uid || 'admin',
            vendorId: newInquiry.vendorId,
            vendorName: selectedVendor?.name || 'Unknown Vendor',
            category: newInquiry.category,
            productImage: newInquiry.image,
            quantityRequested: parseInt(newInquiry.quantity),
            descriptionRequested: newInquiry.description,
            status: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isReadByAdmin: true,
        };

        try {
            await saveDocument('wholesale_inquiries', inquiryData, inquiryData.id);
            setInquiries(prev => [inquiryData, ...prev]);
            setNewInquiry({ vendorId: '', category: '', quantity: '', description: '', image: '' });
            toast({ title: "Inquiry Sent!", description: `Wholesale request sent to ${inquiryData.vendorName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send inquiry" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyRequestLink = (inquiryId: string) => {
        const url = `${window.location.origin}/wholesale-request/${inquiryId}`;
        navigator.clipboard.writeText(url);
        toast({ title: "Request Link Copied!", description: "Send this professional link to your vendor." });
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
            'Date': format(new Date(i.createdAt), 'PP'),
            'Last Updated': format(new Date(i.updatedAt), 'PPp'),
            'Category': i.category,
            'Vendor': i.vendorName,
            'Status': i.status,
            'Qty Requested': i.quantityRequested,
            'Wholesale Price (₹)': i.wholesalePrice || 'N/A',
            'Est. MRP (₹)': i.estimatedMRP || 'N/A',
            'Vendor Note': i.vendorDescription || 'N/A',
            'Alternate Title': i.alternateProduct?.title || 'N/A',
            'Alternate Price (₹)': i.alternateProduct?.wholesalePrice || 'N/A',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Wholesale Reports');
        XLSX.writeFile(wb, `Wholesale_Price_List_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast({ title: "Excel Exported!" });
    };

    const filteredInquiries = inquiries.filter(i => 
        i.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AppShell title="Wholesale Coordination">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Request Form */}
                <Card className="lg:col-span-1 shadow-md border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PlusCircle className="text-primary" />
                            New Stock Inquiry
                        </CardTitle>
                        <CardDescription>Request quotes from vendors using a professional magazine link.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Product Picture</Label>
                            <div 
                                className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50"
                                onClick={() => document.getElementById('inquiry-image')?.click()}
                            >
                                {newInquiry.image ? (
                                    <Image src={newInquiry.image} alt="Inquiry" fill className="object-contain p-2" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-xs text-muted-foreground">Click to upload product photo</p>
                                    </div>
                                )}
                            </div>
                            <input id="inquiry-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Category / Product Type</Label>
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

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="vendor">Select Vendor</Label>
                                <Dialog>
                                    <DialogTrigger asChild><Button variant="link" size="sm" className="h-auto p-0">Add New Vendor</Button></DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Quick Add Vendor</DialogTitle></DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2"><Label>Vendor Name</Label><Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} /></div>
                                            <div className="space-y-2"><Label>Phone</Label><Input value={newVendor.phone} onChange={e => setNewVendor({...newVendor, phone: e.target.value})} /></div>
                                            <div className="space-y-2"><Label>Email</Label><Input value={newVendor.email} onChange={e => setNewVendor({...newVendor, email: e.target.value})} /></div>
                                        </div>
                                        <DialogFooter><DialogClose asChild><Button onClick={handleAddVendor}>Save Vendor</Button></DialogClose></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Select value={newInquiry.vendorId} onValueChange={val => setNewInquiry({...newInquiry, vendorId: val})}>
                                <SelectTrigger><SelectValue placeholder="Choose a supplier..." /></SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="qty">Quantity Needed</Label>
                            <Input id="qty" type="number" placeholder="e.g., 50" value={newInquiry.quantity} onChange={e => setNewInquiry({...newInquiry, quantity: e.target.value})} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Notes for Vendor</Label>
                            <Textarea id="desc" placeholder="e.g., Specific material or size requirements..." value={newInquiry.description} onChange={e => setNewInquiry({...newInquiry, description: e.target.value})} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleSendInquiry} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            Create Inquiry Request
                        </Button>
                    </CardFooter>
                </Card>

                {/* Grid View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                         <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by vendor, category..." 
                                className="pl-9" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={handleExportExcel} disabled={inquiries.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export Excel
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="col-span-full h-48 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                        ) : filteredInquiries.length === 0 ? (
                            <div className="col-span-full text-center py-16 bg-muted/10 rounded-lg border-2 border-dashed">
                                <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-2" />
                                <p className="text-muted-foreground">No matching inquiries found.</p>
                            </div>
                        ) : (
                            filteredInquiries.map(item => (
                                <Card key={item.id} className="overflow-hidden border-t-4 border-t-primary/20">
                                    <div className="relative h-48 w-full bg-muted">
                                        <Image src={item.productImage} alt="Product" fill className="object-contain p-2" />
                                        <Badge className="absolute top-2 right-2 shadow-lg" variant={item.status === 'Pending' ? 'secondary' : 'default'}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-lg">{item.category}</h4>
                                                <p className="text-xs text-muted-foreground">Qty: {item.quantityRequested} &bull; Vendor: {item.vendorName}</p>
                                            </div>
                                            <div className="text-right">
                                                {item.wholesalePrice ? (
                                                    <p className="font-bold text-primary">₹{item.wholesalePrice} <span className="text-[10px] text-muted-foreground">wholesale</span></p>
                                                ) : <span className="text-[10px] text-orange-600 font-bold uppercase">Awaiting Quote</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                                            <Clock className="h-3 w-3" />
                                            <span>Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-2 pt-0 gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopyRequestLink(item.id)}>
                                            <Copy className="h-3 w-3 mr-2" /> Link
                                        </Button>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" className="flex-1"><Eye className="h-3 w-3 mr-2" /> View</Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>Full Inquiry Report</DialogTitle>
                                                    <DialogDescription>Vendor: {item.vendorName} &bull; Category: {item.category}</DialogDescription>
                                                </DialogHeader>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                                    <div className="space-y-4">
                                                        <Label className="text-xs uppercase text-muted-foreground">Original Request</Label>
                                                        <div className="aspect-square relative rounded-lg border bg-white overflow-hidden">
                                                            <Image src={item.productImage} alt="Requested" fill className="object-contain" />
                                                        </div>
                                                        <p className="text-sm italic">"{item.descriptionRequested}"</p>
                                                    </div>
                                                    <div className="space-y-4">
                                                         <Label className="text-xs uppercase text-muted-foreground">Vendor Feedback</Label>
                                                         {item.status === 'Pending' ? (
                                                             <div className="p-8 text-center bg-muted/50 rounded-lg">
                                                                 <Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />
                                                                 <p className="text-xs">Waiting for response...</p>
                                                             </div>
                                                         ) : item.alternateProduct ? (
                                                             <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-3">
                                                                 <Badge className="bg-blue-600">Alternate Proposed</Badge>
                                                                 <div className="aspect-video relative rounded bg-white overflow-hidden border">
                                                                    <Image src={item.alternateProduct.imageDataUri} alt="Alt" fill className="object-contain" />
                                                                 </div>
                                                                 <div className="text-sm">
                                                                    <p className="font-bold">{item.alternateProduct.title}</p>
                                                                    <p className="text-xs text-muted-foreground">{item.alternateProduct.description}</p>
                                                                    <div className="flex justify-between font-bold mt-2 pt-2 border-t border-blue-200">
                                                                        <span>W: ₹{item.alternateProduct.wholesalePrice}</span>
                                                                        <span className="text-muted-foreground line-through">MRP: ₹{item.alternateProduct.estimatedMRP}</span>
                                                                    </div>
                                                                 </div>
                                                             </div>
                                                         ) : (
                                                             <div className="p-4 border rounded-lg bg-green-50/50 space-y-4">
                                                                 <div className="grid grid-cols-2 gap-4">
                                                                     <div className="p-2 bg-white rounded border">
                                                                         <p className="text-[10px] uppercase text-muted-foreground">Wholesale</p>
                                                                         <p className="font-bold text-lg">₹{item.wholesalePrice}</p>
                                                                     </div>
                                                                     <div className="p-2 bg-white rounded border">
                                                                         <p className="text-[10px] uppercase text-muted-foreground">Est. MRP</p>
                                                                         <p className="font-bold text-lg">₹{item.estimatedMRP}</p>
                                                                     </div>
                                                                 </div>
                                                                 <div className="text-sm">
                                                                     <p className="font-medium">Vendor Notes:</p>
                                                                     <p className="text-muted-foreground">{item.vendorDescription || 'No notes provided.'}</p>
                                                                 </div>
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

