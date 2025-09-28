
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Loader2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { sanitizePhoneNumber } from '@/lib/utils';


export type Vendor = {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
};

export default function VendorsPage() {
    const { toast } = useToast();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newVendor, setNewVendor] = useState({ name: '', contactPerson: '', phone: '', email: '' });

    const storageKey = 'vendors_db';

    useEffect(() => {
        try {
            const storedVendors = localStorage.getItem(storageKey);
            if (storedVendors) {
                setVendors(JSON.parse(storedVendors));
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load vendors from local storage." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem(storageKey, JSON.stringify(vendors));
        }
    }, [vendors, isLoading]);

    const handleAddVendor = () => {
        if (!newVendor.name || !newVendor.contactPerson || !newVendor.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide a name, contact person, and phone number." });
            return;
        }

        const vendorToAdd: Vendor = {
            id: `VEND-${uuidv4().substring(0, 8).toUpperCase()}`,
            ...newVendor,
            status: 'approved' // Admins add vendors as approved by default
        };

        setVendors(prev => [...prev, vendorToAdd]);
        setNewVendor({ name: '', contactPerson: '', phone: '', email: '' });
        toast({ title: "Vendor Added", description: `${vendorToAdd.name} has been added and approved.` });
        document.getElementById('close-add-vendor-dialog')?.click();
    };

    const handleRemoveVendor = (id: string) => {
        setVendors(prev => prev.filter(v => v.id !== id));
        toast({ variant: 'destructive', title: "Vendor Removed" });
    };
    
    const handleWhatsAppChat = (vendor: Vendor) => {
        const sanitizedPhone = sanitizePhoneNumber(vendor.phone);
        const message = `Hi ${vendor.name}, regarding our partnership with SnazzPay...`;
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const approvedVendors = vendors.filter(v => v.status === 'approved');

    return (
        <AppShell title="Vendor Management">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Product Vendors</CardTitle>
                        <CardDescription>Manage your list of approved suppliers and product vendors.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Vendor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader><DialogTitle>Add New Vendor</DialogTitle></DialogHeader>
                            <div className="py-4 space-y-4">
                                <div className="space-y-2"><Label htmlFor="vendor-name">Vendor/Company Name</Label><Input id="vendor-name" value={newVendor.name} onChange={(e) => setNewVendor(p => ({ ...p, name: e.target.value }))} placeholder="Global Textiles Inc." /></div>
                                <div className="space-y-2"><Label htmlFor="contact-person">Contact Person</Label><Input id="contact-person" value={newVendor.contactPerson} onChange={(e) => setNewVendor(p => ({ ...p, contactPerson: e.target.value }))} placeholder="Anil Kumar" /></div>
                                <div className="space-y-2"><Label htmlFor="vendor-phone">Phone Number</Label><Input id="vendor-phone" value={newVendor.phone} onChange={(e) => setNewVendor(p => ({ ...p, phone: e.target.value }))} placeholder="9876543210" /></div>
                                <div className="space-y-2"><Label htmlFor="vendor-email">Email (Optional)</Label><Input id="vendor-email" type="email" value={newVendor.email} onChange={(e) => setNewVendor(p => ({ ...p, email: e.target.value }))} placeholder="vendor@example.com" /></div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddVendor}>Save Vendor</Button>
                                <DialogClose asChild><Button variant="outline" id="close-add-vendor-dialog">Cancel</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vendor ID</TableHead>
                                <TableHead>Vendor Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approvedVendors.length > 0 ? approvedVendors.map(vendor => (
                                <TableRow key={vendor.id}>
                                    <TableCell className="font-mono text-xs">{vendor.id}</TableCell>
                                    <TableCell className="font-medium">{vendor.name}</TableCell>
                                     <TableCell>
                                        <div>{vendor.contactPerson}</div>
                                        <div className="text-xs text-muted-foreground">{vendor.phone}</div>
                                    </TableCell>
                                    <TableCell><Badge className="bg-green-100 text-green-800">{vendor.status}</Badge></TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleWhatsAppChat(vendor)}>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            WhatsApp Chat
                                        </Button>
                                        <Button variant="outline" size="icon"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleRemoveVendor(vendor.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">No vendors have been added yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}
