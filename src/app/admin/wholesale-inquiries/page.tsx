
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
import { getCollection, saveDocument, batchUpdateDocuments, addDocument } from "@/services/firestore";
import { v4 as uuidv4 } from 'uuid';
import { Loader2, PlusCircle, ImagePlus, FileSpreadsheet, Send, Search, CheckCircle2, AlertTriangle, Eye, Trash2 } from "lucide-react";
import Image from 'next/image';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import type { WholesaleInquiry, WholesaleStatus } from '@/types/wholesale';
import type { Vendor } from '@/app/vendors/page';

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
        if (!newInquiry.vendorId || !newInquiry.image || !newInquiry.quantity) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please provide a vendor, image, and quantity." });
            return;
        }
        setIsSubmitting(true);
        const selectedVendor = vendors.find(v => v.id === newInquiry.vendorId);
        
        const inquiryData: WholesaleInquiry = {
            id: uuidv4(),
            adminId: user?.uid || 'admin',
            vendorId: newInquiry.vendorId,
            vendorName: selectedVendor?.name || 'Unknown Vendor',
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
            setNewInquiry({ vendorId: '', quantity: '', description: '', image: '' });
            toast({ title: "Inquiry Sent!", description: `wholesale request sent to ${inquiryData.vendorName}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Failed to send inquiry" });
        } finally {
            setIsSubmitting(false);
        }
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
        i.status.toLowerCase().includes(searchQuery.toLowerCase())
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
                        <CardDescription>Send a picture and details to a vendor to ask for pricing.</CardDescription>
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
                            <Label htmlFor="desc">Article Description / Special Notes</Label>
                            <Textarea id="desc" placeholder="e.g., Ceramic Sacred Heart, 6 inch height..." value={newInquiry.description} onChange={e => setNewInquiry({...newInquiry, description: e.target.value})} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleSendInquiry} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Price Request
                        </Button>
                    </CardFooter>
                </Card>

                {/* History Table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                         <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by vendor or status..." 
                                className="pl-9" 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" onClick={handleExportExcel} disabled={inquiries.length === 0}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export to Excel
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Wholesale Inquiry History</CardTitle>
                            <CardDescription>Track vendor responses and pricing.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Article</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Prices (₹)</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                    ) : filteredInquiries.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No inquiries found.</TableCell></TableRow>
                                    ) : (
                                        filteredInquiries.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Image src={item.productImage} alt="item" width={40} height={40} className="rounded-md object-cover aspect-square bg-muted"/>
                                                        <span className="text-xs truncate max-w-[100px]">{item.descriptionRequested}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-xs">{item.vendorName}</TableCell>
                                                <TableCell className="text-xs">{item.quantityRequested}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        item.status === 'Available' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        item.status === 'Alternate Proposed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        item.status === 'Out of Stock' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-gray-50 text-gray-500'
                                                    )}>
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.wholesalePrice ? (
                                                        <div className="text-xs">
                                                            <div className="font-bold">W: ₹{item.wholesalePrice}</div>
                                                            <div className="text-muted-foreground line-through">MRP: ₹{item.estimatedMRP}</div>
                                                        </div>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Inquiry Details - {item.vendorName}</DialogTitle>
                                                                <DialogDescription>Full response from your supplier.</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <Label className="text-muted-foreground uppercase text-[10px]">Your Request</Label>
                                                                        <div className="mt-2 aspect-square relative rounded-lg border overflow-hidden">
                                                                            <Image src={item.productImage} alt="Requested" fill className="object-contain" />
                                                                        </div>
                                                                        <p className="mt-2 text-sm italic">"{item.descriptionRequested}"</p>
                                                                        <p className="text-sm font-bold">Qty: {item.quantityRequested}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4">
                                                                     {item.status === 'Pending' ? (
                                                                         <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/50 rounded-lg">
                                                                             <Loader2 className="h-8 w-8 animate-spin text-primary mb-2"/>
                                                                             <p className="text-sm font-medium">Waiting for vendor response...</p>
                                                                         </div>
                                                                     ) : item.alternateProduct ? (
                                                                         <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                                                                             <Label className="text-blue-700 font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Alternate Product Proposed</Label>
                                                                             <div className="mt-4 aspect-square relative rounded-lg bg-white overflow-hidden border">
                                                                                <Image src={item.alternateProduct.imageDataUri} alt="Alt" fill className="object-contain" />
                                                                             </div>
                                                                             <div className="mt-4 space-y-2 text-sm">
                                                                                <p className="font-bold">{item.alternateProduct.title}</p>
                                                                                <p className="text-xs">{item.alternateProduct.description}</p>
                                                                                <div className="flex justify-between font-bold">
                                                                                    <span>Wholesale: ₹{item.alternateProduct.wholesalePrice}</span>
                                                                                    <span>MRP: ₹{item.alternateProduct.estimatedMRP}</span>
                                                                                </div>
                                                                                <p className="text-xs text-blue-600">Available: {item.alternateProduct.availableQuantity} units</p>
                                                                             </div>
                                                                         </div>
                                                                     ) : (
                                                                         <div className="p-4 border rounded-lg space-y-4">
                                                                             <Label className="text-green-700 font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Stock Details</Label>
                                                                             <div className="grid grid-cols-2 gap-4">
                                                                                 <div className="p-2 bg-muted rounded">
                                                                                     <p className="text-[10px] uppercase text-muted-foreground">Wholesale</p>
                                                                                     <p className="font-bold">₹{item.wholesalePrice}</p>
                                                                                 </div>
                                                                                 <div className="p-2 bg-muted rounded">
                                                                                     <p className="text-[10px] uppercase text-muted-foreground">Est. MRP</p>
                                                                                     <p className="font-bold">₹{item.estimatedMRP}</p>
                                                                                 </div>
                                                                             </div>
                                                                             <div>
                                                                                 <p className="text-[10px] uppercase text-muted-foreground">Vendor Note</p>
                                                                                 <p className="text-sm">{item.vendorDescription || 'No description provided.'}</p>
                                                                             </div>
                                                                         </div>
                                                                     )}
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppShell>
    );
}
