
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Loader2, MessageSquare, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { sanitizePhoneNumber } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, query, where, updateDoc, setDoc } from 'firebase/firestore';


export type Vendor = {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    role: 'vendor';
};

export default function VendorsPage() {
    const { toast } = useToast();
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newVendor, setNewVendor] = useState({ name: '', contactPerson: '', phone: '', email: '' });


    useEffect(() => {
        async function loadData() {
            if (!db) {
                setIsLoading(false);
                return;
            };

            try {
                const usersCollection = collection(db, 'users');
                
                const pendingQuery = query(usersCollection, where('status', '==', 'pending'), where('role', '==', 'vendor'));
                const pendingSnapshot = await getDocs(pendingQuery);
                const pending = pendingSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().companyName,
                    contactPerson: doc.data().companyName,
                    ...doc.data()
                } as Vendor));
                setPendingVendors(pending);
                
                const approvedQuery = query(usersCollection, where('status', '==', 'approved'), where('role', '==', 'vendor'));
                const approvedSnapshot = await getDocs(approvedQuery);
                const approved = approvedSnapshot.docs.map(doc => ({
                     id: doc.id,
                     name: doc.data().companyName,
                     contactPerson: doc.data().companyName,
                     ...doc.data()
                } as Vendor));
                setApprovedVendors(approved);

            } catch (error) {
                toast({ variant: 'destructive', title: "Error loading data", description: "Could not load vendors from Firestore. This might be a Firestore rules issue." });
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [toast]);

    const handleAddVendor = async () => {
        if (!newVendor.name || !newVendor.contactPerson || !newVendor.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide a name, contact person, and phone number." });
            return;
        }
        if (!db) return;

        const vendorId = `VEND-${uuidv4().substring(0, 8).toUpperCase()}`;
        const vendorToAdd: Omit<Vendor, 'id' | 'status' | 'role'> & {id: string, status: 'approved', role: 'vendor'} = {
            id: vendorId,
            name: newVendor.name,
            contactPerson: newVendor.contactPerson,
            phone: newVendor.phone,
            email: newVendor.email,
            status: 'approved', // Admins add vendors as approved by default
            role: 'vendor'
        };
        
        try {
            await setDoc(doc(db, "users", vendorId), {
                id: vendorId,
                companyName: vendorToAdd.name,
                phone: vendorToAdd.phone,
                email: vendorToAdd.email,
                status: 'approved',
                role: 'vendor'
            });
            setApprovedVendors(prev => [...prev, vendorToAdd]);
            setNewVendor({ name: '', contactPerson: '', phone: '', email: '' });
            toast({ title: "Vendor Added", description: `${vendorToAdd.name} has been added and approved.` });
            document.getElementById('close-add-vendor-dialog')?.click();
        } catch (error) {
             toast({ variant: 'destructive', title: "Error Adding Vendor", description: "Could not save vendor to the database." });
        }
    };
    
    const handleUpdateRequest = async (vendorId: string, newStatus: 'approved' | 'rejected') => {
        if (!db) return;
        try {
            const docRef = doc(db, "users", vendorId);
            await updateDoc(docRef, { status: newStatus });
            
            const updatedPending = pendingVendors.filter(v => v.id !== vendorId);
            setPendingVendors(updatedPending);

            if (newStatus === 'approved') {
                const vendor = pendingVendors.find(v => v.id === vendorId);
                if (vendor) setApprovedVendors(prev => [...prev, {...vendor, status: 'approved'}]);
            }
            
            toast({
                title: `Vendor Request ${newStatus}`,
                description: `The vendor has been ${newStatus}.`,
            });
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        }
    };
    
    const handleWhatsAppChat = (vendor: Vendor) => {
        const sanitizedPhone = sanitizePhoneNumber(vendor.phone);
        const message = `Hi ${vendor.name}, regarding our partnership with SnazzPay...`;
        const whatsappUrl = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };


    return (
        <AppShell title="Vendor Management">
            <Tabs defaultValue="requests">
                <TabsList className="grid w-full grid-cols-2 max-w-lg">
                    <TabsTrigger value="requests">Signup Requests <Badge className="ml-2">{pendingVendors.length}</Badge></TabsTrigger>
                    <TabsTrigger value="approved">Approved Vendors</TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Vendor Signup Requests</CardTitle>
                            <CardDescription>Review and approve new vendors who wish to supply products.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {pendingVendors.length > 0 ? pendingVendors.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.name}</TableCell>
                                            <TableCell>
                                                <div>{req.contactPerson}</div>
                                                <div className="text-xs text-muted-foreground">{req.phone}</div>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateRequest(req.id, 'approved')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req.id, 'rejected')}><X className="mr-2 h-4 w-4" />Reject</Button>
                                            </TableCell>
                                        </TableRow>
                                   )) : (
                                     <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No pending vendor requests.</TableCell></TableRow>
                                   )}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Approved Product Vendors</CardTitle>
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
                                                <Button variant="outline" size="icon" disabled><Edit className="h-4 w-4" /></Button>
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
                </TabsContent>
            </Tabs>
        </AppShell>
    );
}
