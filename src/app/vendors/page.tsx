
'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, MessageSquare, Check, X, Send, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCollection, saveDocument, createChat, getDocument } from '@/services/firestore';
import type { ProductDrop } from '@/app/vendor/product-drops/page';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';

export type Vendor = {
    id: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    dropCount?: number;
};

type UserPermissions = {
    id: string; // same as user.id
    productDropLimit?: number;
};


export default function VendorsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [approvedVendors, setApprovedVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newVendor, setNewVendor] = useState({ name: '', contactPerson: '', phone: '', email: '' });
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [permissions, setPermissions] = useState<UserPermissions | null>(null);

    const loadVendors = async () => {
        setIsLoading(true);
        try {
            const allVendors = await getCollection<Vendor>('vendors');
            const productDrops = await getCollection<ProductDrop>('product_drops');

            const dropCounts = productDrops.reduce((acc, drop) => {
                acc[drop.vendorId] = (acc[drop.vendorId] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const vendorsWithCounts = allVendors.map(vendor => ({
                ...vendor,
                dropCount: dropCounts[vendor.id] || 0
            }));

            setPendingVendors(vendorsWithCounts.filter(v => v.status === 'pending'));
            setApprovedVendors(vendorsWithCounts.filter(v => v.status === 'approved'));

        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: "Could not load vendors from Firestore." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadVendors();
    }, [toast]);

    const handleAddVendor = async () => {
        if (!newVendor.name || !newVendor.contactPerson || !newVendor.phone) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide a name, contact person, and phone number." });
            return;
        }

        const newVendorId = uuidv4();
        const vendorToAdd: Omit<Vendor, 'id'> = {
            ...newVendor,
            status: 'approved' // Admins add vendors as approved by default
        };
        
        try {
            await saveDocument('vendors', vendorToAdd, newVendorId);
            await loadVendors(); // Reload all vendors to get updated list
            setNewVendor({ name: '', contactPerson: '', phone: '', email: '' });
            toast({ title: "Vendor Added", description: `${newVendor.name} has been added and approved.` });
            document.getElementById('close-add-vendor-dialog')?.click();
        } catch (error) {
            console.error("Error adding vendor:", error)
            toast({ variant: 'destructive', title: "Error Adding Vendor" });
        }
    };
    
    const handleUpdateRequest = async (vendorId: string, isApproved: boolean) => {
        const vendor = pendingVendors.find(v => v.id === vendorId);
        if(!vendor) return;

        const newStatus = isApproved ? 'approved' : 'rejected';

        try {
            await saveDocument('vendors', { ...vendor, status: newStatus }, vendor.id);
            await loadVendors(); // Reload all vendors
            
            toast({
                title: `Vendor Request ${isApproved ? 'Approved' : 'Rejected'}`,
                description: `The vendor has been ${isApproved ? 'approved' : 'rejected'}.`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error updating vendor" });
        }
    };
    
    const handleChat = async (vendor: Vendor) => {
        try {
            const chatId = `admin_${vendor.id}`;
            const participantNames = {
                'admin': 'Admin',
                [vendor.id]: vendor.name
            };
            await createChat(chatId, ['admin', vendor.id], participantNames);
            router.push('/chat-integration-info');
        } catch (error) {
            console.error("Error creating chat:", error);
            toast({ variant: 'destructive', title: 'Failed to start chat.' });
        }
    };

    const openManageDialog = async (vendor: Vendor) => {
        setSelectedVendor(vendor);
        const perms = await getDocument<UserPermissions>('user_permissions', vendor.id);
        setPermissions(perms || { id: vendor.id, productDropLimit: 50 });
    };

    const handleSavePermissions = async () => {
        if (!permissions) return;
        try {
            await saveDocument('user_permissions', permissions, permissions.id);
            toast({ title: "Permissions Saved", description: "The user's feature access has been updated." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error saving permissions" });
        }
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
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateRequest(req.id, true)}><Check className="mr-2 h-4 w-4" />Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleUpdateRequest(req.id, false)}><X className="mr-2 h-4 w-4" />Reject</Button>
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
                                        <TableHead>Drops</TableHead>
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
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Send className="h-4 w-4 text-muted-foreground"/> {vendor.dropCount || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge className="bg-green-100 text-green-800">{vendor.status}</Badge></TableCell>
                                            <TableCell className="text-right space-x-1">
                                                 <Dialog onOpenChange={(open) => !open && setSelectedVendor(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" onClick={() => openManageDialog(vendor)}>
                                                            <Settings className="mr-2 h-4 w-4" /> Manage
                                                        </Button>
                                                    </DialogTrigger>
                                                    {selectedVendor?.id === vendor.id && permissions && (
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Manage Access for {selectedVendor.name}</DialogTitle>
                                                                <DialogDescription>Set custom usage limits for premium features.</DialogDescription>
                                                            </DialogHeader>
                                                            <div className="py-4 space-y-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="product-drop-limit">Product Drop Limit</Label>
                                                                    <Input
                                                                        id="product-drop-limit"
                                                                        type="number"
                                                                        value={permissions.productDropLimit || 50}
                                                                        onChange={(e) => setPermissions(p => p ? {...p, productDropLimit: parseInt(e.target.value, 10)} : null)}
                                                                    />
                                                                    <p className="text-xs text-muted-foreground">Set the total number of product drops this vendor can create. Default is 50.</p>
                                                                </div>
                                                            </div>
                                                            <DialogFooter>
                                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                                <DialogClose asChild><Button onClick={handleSavePermissions}>Save Permissions</Button></DialogClose>
                                                            </DialogFooter>
                                                        </DialogContent>
                                                    )}
                                                </Dialog>
                                                <Button size="sm" variant="secondary" onClick={() => handleChat(vendor)}>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    Chat
                                                </Button>
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
